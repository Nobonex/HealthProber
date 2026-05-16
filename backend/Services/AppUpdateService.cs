using System.Reflection;
using Velopack;
using Velopack.Exceptions;
using Velopack.Locators;
using Velopack.Sources;

namespace HealthProber.API.Services;

public interface IAppUpdateService
{
    /// <summary>
    /// The currently installed application version, if known. Falls back to assembly version when not installed by Velopack.
    /// </summary>
    string CurrentVersion { get; }

    /// <summary>
    /// Checks for available updates. Returns null if no update is available or if the check fails.
    /// Errors are logged at Warning level.
    /// </summary>
    Task<UpdateInfo?> CheckForUpdateAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Downloads and installs the latest update, then restarts the application.
    /// </summary>
    Task DownloadAndInstallUpdateAsync(CancellationToken cancellationToken = default);
}

public class AppUpdateService(ILogger<AppUpdateService> logger, IConfiguration configuration) : IAppUpdateService
{
    public string CurrentVersion
    {
        get
        {
            try
            {
                var v = VelopackLocator.Current.CurrentlyInstalledVersion;
                if (v != null)
                    return v.ToString();
            }
            catch (InvalidOperationException)
            {
                // VelopackApp.Build().Run() was not called yet — ignore.
            }

            // Fallback to assembly version for non-Velopack runs (e.g. dotnet run).
            return Assembly.GetExecutingAssembly().GetName().Version?.ToString()
                ?? "0.0.0-local";
        }
    }

    public async Task<UpdateInfo?> CheckForUpdateAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var source = CreateSource();
            var mgr = new UpdateManager(source);
            var update = await mgr.CheckForUpdatesAsync();

            if (update is null)
            {
                logger.LogInformation(
                    "No update available. Current version {CurrentVersion} matches latest release.",
                    CurrentVersion);
            }
            else
            {
                logger.LogInformation(
                    "Update available: {LatestVersion} (current: {CurrentVersion}).",
                    update.TargetFullRelease.Version,
                    CurrentVersion);
            }

            return update;
        }
        catch (NotInstalledException ex)
        {
            logger.LogWarning(ex,
                "Update check skipped — the application is not installed via Velopack. " +
                "This is expected when running from 'dotnet run' without a Velopack installation.");
            return null;
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Failed to check for updates — network error connecting to update source.");
            return null;
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex,
                "Failed to check for updates — invalid operation. This usually means the update feed could not be found or parsed.");
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to check for updates — unexpected error.");
            return null;
        }
    }

    public async Task DownloadAndInstallUpdateAsync(CancellationToken cancellationToken = default)
    {
        var source = CreateSource();
        var mgr = new UpdateManager(source);

        var update = await mgr.CheckForUpdatesAsync();
        if (update is null)
        {
            logger.LogInformation("No update available to install.");
            return;
        }

        logger.LogInformation("Downloading update {TargetFullRelease}...", update.TargetFullRelease.Version);
        await mgr.DownloadUpdatesAsync(update, progress: p =>
        {
            if (p % 10 == 0)
            {
                logger.LogDebug("Download progress: {Progress}%", p);
            }
        }, cancelToken: cancellationToken);

        logger.LogInformation("Applying update and restarting...");
        mgr.ApplyUpdatesAndRestart(update);
    }

    private GithubSource CreateSource()
    {
        var repoUrl = configuration.GetValue<string?>("Update:GithubRepoUrl")
            ?? "https://github.com/Nobonex/HealthProber";

        var accessToken = configuration.GetValue<string?>("Update:GithubToken");
        var allowPrerelease = configuration.GetValue<bool>("Update:AllowPrerelease");

        logger.LogDebug(
            "Creating GithubSource for {RepoUrl} (prerelease: {AllowPrerelease}).",
            repoUrl, allowPrerelease);

        return new GithubSource(repoUrl, accessToken, allowPrerelease);
    }
}

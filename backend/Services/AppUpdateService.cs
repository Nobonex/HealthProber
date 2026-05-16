using Velopack;
using Velopack.Sources;

namespace HealthProber.API.Services;

public interface IAppUpdateService
{
    Task<UpdateInfo?> CheckForUpdateAsync(CancellationToken cancellationToken = default);
    Task DownloadAndInstallUpdateAsync(CancellationToken cancellationToken = default);
}

public class AppUpdateService(ILogger<AppUpdateService> logger, IConfiguration configuration) : IAppUpdateService
{
    public async Task<UpdateInfo?> CheckForUpdateAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var source = CreateSource();
            var mgr = new UpdateManager(source);
            var update = await mgr.CheckForUpdatesAsync();
            return update;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to check for updates.");
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
            logger.LogInformation("No update available.");
            return;
        }

        logger.LogInformation("Downloading update {TargetFullRelease}...", update.TargetFullRelease.Version);
        await mgr.DownloadUpdatesAsync(update);

        logger.LogInformation("Applying update and restarting...");
        mgr.ApplyUpdatesAndRestart(update);
    }

    private GithubSource CreateSource()
    {
        var repoUrl = configuration.GetValue<string?>("Update:GithubRepoUrl")
            ?? "https://github.com/Nobonex/HealthProber";

        var accessToken = configuration.GetValue<string?>("Update:GithubToken");
        var allowPrerelease = configuration.GetValue<bool>("Update:AllowPrerelease");

        return new GithubSource(repoUrl, accessToken, allowPrerelease);
    }
}

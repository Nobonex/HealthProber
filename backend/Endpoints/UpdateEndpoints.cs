using HealthProber.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace HealthProber.API.Endpoints;

public static class UpdateEndpoints
{
    public static IEndpointRouteBuilder MapUpdateEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api")
            .WithTags("Updates")
            .WithOpenApi();

        api.MapGet("/update/status", async (
            [FromServices] IAppUpdateService updateService,
            CancellationToken cancellationToken) =>
        {
            var update = await updateService.CheckForUpdateAsync(cancellationToken);
            var currentVersion = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version;
            var latestVersion = update?.TargetFullRelease?.Version?.ToString();

            return TypedResults.Ok(new
            {
                CurrentVersion = currentVersion?.ToString(),
                LatestVersion = latestVersion,
                UpdateAvailable = latestVersion != null && currentVersion != null && latestVersion != currentVersion.ToString()
            });
        })
        .WithName("UpdateStatus")
        .WithSummary("Check for available updates")
        .WithDescription("Queries the configured update source (GitHub Releases) and returns the current and latest version information.")
        .Produces<object>(StatusCodes.Status200OK);

        api.MapPost("/update/install", async (
            [FromServices] IAppUpdateService updateService,
            CancellationToken cancellationToken) =>
        {
            await updateService.DownloadAndInstallUpdateAsync(cancellationToken);
            return TypedResults.Ok(new { Message = "Update downloaded and will be applied on restart." });
        })
        .WithName("InstallUpdate")
        .WithSummary("Download and install the latest update")
        .WithDescription("Downloads the latest update package and triggers an application restart to apply it.")
        .Produces<object>(StatusCodes.Status200OK);

        return app;
    }
}

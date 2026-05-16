using HealthProber.API.Models;
using HealthProber.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace HealthProber.API.Endpoints;

public static class ProbeEndpoints
{
    public static IEndpointRouteBuilder MapProbeEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api")
            .WithTags("Health Probes")
            .WithOpenApi();

        api.MapPost("/probe", async (
            [FromBody] ProbeRequest request,
            IHealthProbeService probeService,
            CancellationToken cancellationToken) =>
        {
            var result = await probeService.ProbeAsync(request, cancellationToken);
            return TypedResults.Ok(result);
        })
        .WithName("ProbeEndpoint")
        .WithSummary("Performs an HTTP health probe")
        .WithDescription("Sends an HTTP request to the specified URL and returns timing, status code, and outcome.")
        .Produces<ProbeResponse>(StatusCodes.Status200OK)
        .ProducesValidationProblem();

        return app;
    }
}

namespace HealthProber.API.Models;

public record ProbeResponse(
    int? StatusCode,
    long ResponseTimeMs,
    string Outcome,
    string? ErrorMessage
);

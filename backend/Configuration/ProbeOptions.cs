namespace HealthProber.API.Configuration;

public class ProbeOptions
{
    public int DefaultTimeoutSeconds { get; set; } = 30;
    public int MaxTimeoutSeconds { get; set; } = 120;
}

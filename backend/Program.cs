using HealthProber.API.Configuration;
using HealthProber.API.Endpoints;
using HealthProber.API.Infrastructure;
using HealthProber.API.Services;

var webRoot = SpaAssetExtractor.EnsureSpaAssetsExtracted();

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = webRoot
});

builder.Services.Configure<ServerOptions>(
    builder.Configuration.GetSection("Server"));

builder.Services.Configure<ProbeOptions>(
    builder.Configuration.GetSection("Probe"));

var serverPort = builder.Configuration.GetValue<int?>("Server:Port") ?? 5432;
builder.WebHost.UseUrls($"http://localhost:{serverPort}");

builder.Services.AddHttpClient("ProbeClient")
    .AddStandardResilienceHandler(options =>
    {
        options.Retry.MaxRetryAttempts = 2;
        options.Retry.Delay = TimeSpan.FromSeconds(1);
        options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
        options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(60);
    });

builder.Services.AddScoped<IHealthProbeService, HealthProbeService>();
builder.Services.AddExceptionHandler<PortConflictExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapOpenApi();
app.MapProbeEndpoints();
app.MapFallbackToFile("index.html");

app.Run();

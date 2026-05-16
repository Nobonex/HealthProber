using HealthProber.API.Configuration;
using HealthProber.API.Endpoints;
using HealthProber.API.Infrastructure;
using HealthProber.API.Services;
using Velopack;

VelopackApp.Build().Run();

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
builder.Services.AddSingleton<IAppUpdateService, AppUpdateService>();
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
app.MapUpdateEndpoints();
app.MapFallbackToFile("index.html");

var cts = new CancellationTokenSource();
Task webHostTask;

try
{
    webHostTask = app.RunAsync(cts.Token);

    // Give Kestrel a moment to start; if it faults (e.g. port in use) we surface it here.
    var startupTimeout = Task.Delay(TimeSpan.FromSeconds(3), cts.Token);
    var completed = await Task.WhenAny(webHostTask, startupTimeout);

    if (completed == webHostTask && webHostTask.IsFaulted)
    {
        throw webHostTask.Exception.GetBaseException();
    }
}
catch (IOException ex) when (ex.Message.Contains("Failed to bind", StringComparison.OrdinalIgnoreCase)
                           || ex.Message.Contains("address already in use", StringComparison.OrdinalIgnoreCase))
{
    // Port conflict before the tray icon is shown.
    const uint mbYesNo = 0x04;
    const uint mbIconQuestion = 0x20;
    const int idYes = 6;

    var message = $"Port {serverPort} is already in use by another HealthProber instance.\n\nOpen the existing instance?";
    var hasConsole = NativeMethods.GetConsoleWindow() != 0;

    if (!hasConsole)
    {
        var result = NativeMethods.MessageBox(0, message, "HealthProber", mbYesNo | mbIconQuestion);
        if (result == idYes)
        {
            Process.Start(new ProcessStartInfo($"http://localhost:{serverPort}") { UseShellExecute = true });
        }
    }
    else
    {
        Console.WriteLine($"Port {serverPort} is already in use.");
    }

    Environment.Exit(1);
    return;
}

// Web host started successfully — run the tray icon on the main (UI) thread.
var trayContext = new TrayApplicationContext(serverPort, cts);

// Background update check
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(TimeSpan.FromSeconds(5), cts.Token);
        var updateService = app.Services.GetRequiredService<IAppUpdateService>();
        var update = await updateService.CheckForUpdateAsync(cts.Token);
        if (update?.TargetFullRelease != null)
        {
            trayContext.ShowUpdateAvailable(update.TargetFullRelease.Version.ToString());
        }
    }
    catch (OperationCanceledException)
    {
        // ignore
    }
    catch
    {
        // Silently ignore update check failures in the background.
    }
}, cts.Token);

Application.Run(trayContext);

// Tray Exit was clicked: signal the web host to shut down.
cts.Cancel();

// Wait for graceful shutdown with a timeout.
try
{
    await Task.WhenAny(webHostTask, Task.Delay(TimeSpan.FromSeconds(5)));
}
catch
{
    // Ignore shutdown exceptions.
}

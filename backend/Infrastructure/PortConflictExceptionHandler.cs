using System.Diagnostics;
using System.IO;
using Microsoft.AspNetCore.Diagnostics;

namespace HealthProber.API.Infrastructure;

public class PortConflictExceptionHandler(ILogger<PortConflictExceptionHandler> logger) : IExceptionHandler
{
    public ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is IOException ioex && (ioex.Message.Contains("address already in use") || ioex.Message.Contains("Failed to bind")))
        {
            const uint mbYesNo = 0x04;
            const uint mbIconQuestion = 0x20;
            const int idYes = 6;

            var message = $"Port {httpContext.Request.Host.Port ?? 5432} is already in use by another HealthProber instance.\n\nOpen the existing instance?";

            var hasConsole = NativeMethods.GetConsoleWindow() != 0;

            if (!hasConsole)
            {
                var result = NativeMethods.MessageBox(0, message, "HealthProber", mbYesNo | mbIconQuestion);
                if (result == idYes)
                {
                    Process.Start(new ProcessStartInfo("http://localhost:5432") { UseShellExecute = true });
                }
            }
            else
            {
                logger.LogCritical("Port {Port} is already in use.", httpContext.Request.Host.Port ?? 5432);
            }

            Environment.Exit(1);
            return ValueTask.FromResult(true);
        }

        return ValueTask.FromResult(false);
    }
}

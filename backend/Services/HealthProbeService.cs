using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using HealthProber.API.Models;

namespace HealthProber.API.Services;

public interface IHealthProbeService
{
    Task<ProbeResponse> ProbeAsync(ProbeRequest request, CancellationToken cancellationToken = default);
}

public class HealthProbeService(IHttpClientFactory httpClientFactory) : IHealthProbeService
{
    public async Task<ProbeResponse> ProbeAsync(ProbeRequest request, CancellationToken cancellationToken = default)
    {
        var client = httpClientFactory.CreateClient("ProbeClient");

        var url = request.Url;
        if (request.QueryParams.Count > 0)
        {
            var query = string.Join("&", request.QueryParams
                .Where(p => !string.IsNullOrEmpty(p.Key))
                .Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
            url += (url.Contains('?') ? "&" : "?") + query;
        }

        using var httpRequest = new HttpRequestMessage(new HttpMethod(request.Method), url);

        foreach (var header in request.Headers.Where(h => !string.IsNullOrEmpty(h.Key)))
        {
            httpRequest.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        if (request.Auth.Type.Equals("bearer", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(request.Auth.Token))
        {
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", request.Auth.Token);
        }
        else if (request.Auth.Type.Equals("basic", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(request.Auth.Username))
        {
            var credential = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{request.Auth.Username}:{request.Auth.Password}"));
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Basic", credential);
        }

        var stopwatch = Stopwatch.StartNew();
        try
        {
            using var response = await client.SendAsync(httpRequest, cancellationToken);
            stopwatch.Stop();
            var responseTimeMs = stopwatch.ElapsedMilliseconds;
            var outcome = response.IsSuccessStatusCode ? "success" : "error";

            return new ProbeResponse(
                (int)response.StatusCode,
                responseTimeMs,
                outcome,
                null
            );
        }
        catch (TaskCanceledException)
        {
            stopwatch.Stop();
            return new ProbeResponse(null, stopwatch.ElapsedMilliseconds, "timeout", "Request timed out");
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();
            return new ProbeResponse(null, stopwatch.ElapsedMilliseconds, "error", ex.Message);
        }
    }
}

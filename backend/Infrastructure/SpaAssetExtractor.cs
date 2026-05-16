using System.IO.Compression;
using System.Reflection;

namespace HealthProber.API.Infrastructure;

public static class SpaAssetExtractor
{
    public static string EnsureSpaAssetsExtracted()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var baseDir = AppContext.BaseDirectory;

        // Prefer a local wwwroot next to the executable (Debug builds with robocopy)
        var candidates = new[]
        {
            Path.Combine(baseDir, "wwwroot")
        };

        foreach (var candidate in candidates)
        {
            if (Directory.Exists(candidate) && Directory.EnumerateFileSystemEntries(candidate).Any())
            {
                return candidate;
            }
        }

        // Use deterministic temp path based on assembly version so we only extract once per version
        var version = assembly.GetName().Version?.ToString() ?? "0.0.0.0";
        var tempRoot = Path.Combine(Path.GetTempPath(), "HealthProber", version);
        var extractedWwwroot = Path.Combine(tempRoot, "wwwroot");
        var sentinelFile = Path.Combine(tempRoot, ".extracted");

        if (File.Exists(sentinelFile))
        {
            return extractedWwwroot;
        }

        const string resourceName = "spa.zip";
        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            throw new InvalidOperationException($"Embedded resource '{resourceName}' not found.");
        }

        if (Directory.Exists(extractedWwwroot))
        {
            Directory.Delete(extractedWwwroot, recursive: true);
        }

        Directory.CreateDirectory(extractedWwwroot);
        using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
        zip.ExtractToDirectory(extractedWwwroot);

        File.WriteAllText(sentinelFile, DateTime.UtcNow.ToString("o"));

        return extractedWwwroot;
    }
}

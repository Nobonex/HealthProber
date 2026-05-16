using System.ComponentModel.DataAnnotations;

namespace HealthProber.API.Models;

public record HeaderItem(
    [Required] string Key,
    string Value
);

public record QueryParamItem(
    [Required] string Key,
    string Value
);

public record AuthConfig(
    string Type,
    string? Token,
    string? Username,
    string? Password
);

public record ProbeRequest(
    [Required]
    [Url]
    string Url,

    [Required]
    [RegularExpression(@"^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)$", ErrorMessage = "Invalid HTTP method.")]
    string Method,

    List<HeaderItem> Headers,

    List<QueryParamItem> QueryParams,

    AuthConfig Auth
);

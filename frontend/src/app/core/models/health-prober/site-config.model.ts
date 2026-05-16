export interface SiteConfig {
    id: string;
    name: string;
    endpoints: SiteEndpoint[];
    auth: AuthConfig;
    warningThresholdMs: number;
    criticalThresholdMs: number;
    pollingIntervalMs: number;
}

export interface SiteEndpoint {
    id: string;
    url: string;
    method: 'GET' | 'HEAD';
    headers: { key: string; value: string }[];
    queryParams: { key: string; value: string }[];
}

export type AuthConfig =
    | { type: 'none' }
    | { type: 'bearer'; token: string }
    | { type: 'basic'; username: string; password: string };

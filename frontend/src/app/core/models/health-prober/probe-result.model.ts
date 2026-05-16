export interface ProbeResult {
    siteId: string;
    endpointId: string;
    checkedAt: number;
    statusCode: number | null;
    responseTimeMs: number;
    outcome: 'success' | 'slow' | 'error' | 'timeout' | 'cors';
}

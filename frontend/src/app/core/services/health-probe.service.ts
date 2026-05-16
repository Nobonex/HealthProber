import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProbeResult } from '@app/core/models/health-prober/probe-result.model';
import { SiteEndpoint } from '@app/core/models/health-prober/site-config.model';
import { AuthStorageService } from './auth-storage.service';

interface ProxyProbeResponse {
    statusCode: number | null;
    responseTimeMs: number;
    outcome: 'success' | 'error' | 'timeout';
    errorMessage: string | null;
}

@Injectable({
    providedIn: 'root',
})
export class HealthProbeService {
    private readonly http = inject(HttpClient);
    private readonly authStorage = inject(AuthStorageService);

    public probe(siteId: string, endpoint: SiteEndpoint): Observable<ProbeResult> {
        const auth = this.authStorage.load(siteId);

        return this.http
            .post<ProxyProbeResponse>('/api/probe', {
                url: endpoint.url,
                method: endpoint.method,
                headers: endpoint.headers.filter((h) => h.key),
                queryParams: endpoint.queryParams.filter((p) => p.key),
                auth: {
                    type: auth.type,
                    token: auth.type === 'bearer' ? auth.token : null,
                    username: auth.type === 'basic' ? auth.username : null,
                    password: auth.type === 'basic' ? auth.password : null,
                },
            })
            .pipe(
                map((response) => ({
                    siteId,
                    endpointId: endpoint.id,
                    checkedAt: Date.now(),
                    statusCode: response.statusCode,
                    responseTimeMs: response.responseTimeMs,
                    outcome: response.outcome,
                })),
            );
    }
}

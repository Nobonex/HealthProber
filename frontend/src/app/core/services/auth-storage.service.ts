import { Injectable } from '@angular/core';
import { AuthConfig } from '@app/core/models/health-prober/site-config.model';

const PREFIX = 'healthprober-auth';

@Injectable({
    providedIn: 'root',
})
export class AuthStorageService {
    public save(siteId: string, auth: AuthConfig): void {
        sessionStorage.setItem(`${PREFIX}-${siteId}`, JSON.stringify(auth));
    }

    public load(siteId: string): AuthConfig {
        const raw = sessionStorage.getItem(`${PREFIX}-${siteId}`);
        if (raw === null) {
            return { type: 'none' };
        }
        try {
            return JSON.parse(raw) as AuthConfig;
        } catch {
            return { type: 'none' };
        }
    }

    public clear(siteId: string): void {
        sessionStorage.removeItem(`${PREFIX}-${siteId}`);
    }
}

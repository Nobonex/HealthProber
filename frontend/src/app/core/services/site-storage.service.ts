import { Injectable, signal } from '@angular/core';
import { SiteConfig } from '@app/core/models/health-prober/site-config.model';

const STORAGE_KEY = 'healthprober-sites';

@Injectable({
    providedIn: 'root',
})
export class SiteStorageService {
    public readonly $sites = signal<SiteConfig[]>(this.load());

    public add(site: SiteConfig): void {
        this.$sites.update((sites) => [...sites, site]);
        this.persist();
    }

    public update(site: SiteConfig): void {
        this.$sites.update((sites) =>
            sites.map((s) => (s.id === site.id ? site : s)),
        );
        this.persist();
    }

    public delete(id: string): void {
        this.$sites.update((sites) => sites.filter((s) => s.id !== id));
        this.persist();
    }

    private load(): SiteConfig[] {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            return [];
        }
        try {
            return JSON.parse(raw) as SiteConfig[];
        } catch {
            return [];
        }
    }

    private persist(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.$sites()));
    }
}

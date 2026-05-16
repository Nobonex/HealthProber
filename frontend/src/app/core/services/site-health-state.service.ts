import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { forkJoin, Observable, of, Subject, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { HealthStatus } from '@app/core/models/health-prober/health-status.enum';
import { ProbeResult } from '@app/core/models/health-prober/probe-result.model';
import { SiteConfig } from '@app/core/models/health-prober/site-config.model';
import { HealthProbeService } from './health-probe.service';
import { SiteStorageService } from './site-storage.service';

@Injectable({
    providedIn: 'root',
})
export class SiteHealthStateService {
    private readonly probeService = inject(HealthProbeService);
    private readonly siteStorage = inject(SiteStorageService);
    private readonly restart$ = new Subject<void>();

    public readonly $results = signal<Record<string, ProbeResult[]>>({});
    public readonly $statuses = computed(() => {
        const sites = this.siteStorage.$sites();
        const results = this.$results();
        const map: Record<string, HealthStatus> = {};
        for (const site of sites) {
            map[site.id] = this.computeStatus(site, results[site.id] ?? []);
        }
        return map;
    });

    public constructor() {
        effect(() => {
            const sites = this.siteStorage.$sites();
            this.startPolling(sites);
        });
    }

    public refreshAll(): void {
        const sites = this.siteStorage.$sites();
        for (const site of sites) {
            this.probeSite(site);
        }
    }

    public refreshSite(siteId: string): void {
        const site = this.siteStorage.$sites().find((s) => s.id === siteId);
        if (site !== undefined) {
            this.probeSite(site);
        }
    }

    private startPolling(sites: SiteConfig[]): void {
        this.restart$.next();
        this.$results.set({});

        for (const site of sites) {
            if (site.pollingIntervalMs === 0) {
                this.probeSite(site);
                continue;
            }

            timer(0, site.pollingIntervalMs)
                .pipe(
                    takeUntil(this.restart$),
                    switchMap(() => this.probeSite$(site)),
                )
                .subscribe((results) => {
                    this.$results.update((map) => ({
                        ...map,
                        [site.id]: results,
                    }));
                });
        }
    }

    private probeSite(site: SiteConfig): void {
        this.probeSite$(site).subscribe((results) => {
            this.$results.update((map) => ({
                ...map,
                [site.id]: results,
            }));
        });
    }

    private probeSite$(site: SiteConfig): Observable<ProbeResult[]> {
        const probes = site.endpoints.map((endpoint) =>
            this.probeService.probe(site.id, endpoint).pipe(
                catchError(() =>
                    of({
                        siteId: site.id,
                        endpointId: endpoint.id,
                        checkedAt: Date.now(),
                        statusCode: null,
                        responseTimeMs: 0,
                        outcome: 'error' as const,
                    }),
                ),
            ),
        );
        return forkJoin(probes);
    }

    private computeStatus(site: SiteConfig, results: ProbeResult[]): HealthStatus {
        if (results.length === 0) {
            return HealthStatus.EntirelyOut;
        }

        let hasPartial = false;

        for (const result of results) {
            if (
                result.outcome === 'success' &&
                result.responseTimeMs < site.warningThresholdMs
            ) {
                continue;
            } else if (
                result.outcome === 'slow' ||
                (result.outcome === 'success' &&
                    result.responseTimeMs >= site.warningThresholdMs) ||
                (result.statusCode !== null &&
                    result.statusCode >= 400 &&
                    result.statusCode < 500)
            ) {
                hasPartial = true;
            } else {
                return HealthStatus.EntirelyOut;
            }
        }

        if (hasPartial) {
            return HealthStatus.PartiallyOut;
        }

        return HealthStatus.Healthy;
    }
}

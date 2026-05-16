import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { DestroyRef } from '@angular/core';

export interface UpdateStatus {
    currentVersion: string | null;
    latestVersion: string | null;
    updateAvailable: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class UpdateService {
    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);

    public readonly $updateAvailable = signal<boolean>(false);
    public readonly $latestVersion = signal<string | null>(null);
    public readonly $currentVersion = signal<string | null>(null);

    private pollSubscription: Subscription | null = null;

    constructor() {
        this.startPolling();
    }

    public checkNow(): void {
        this.http.get<UpdateStatus>('/api/update/status')
            .pipe(
                catchError(() => {
                    // Silently fail if the endpoint is unreachable.
                    return [];
                })
            )
            .subscribe((status) => {
                if (status) {
                    this.$currentVersion.set(status.currentVersion);
                    this.$latestVersion.set(status.latestVersion);
                    this.$updateAvailable.set(status.updateAvailable);
                }
            });
    }

    public installUpdate(): void {
        this.http.post<{ message: string }>('/api/update/install', {})
            .subscribe({
                next: () => {
                    // The backend will restart the process.
                    this.$updateAvailable.set(false);
                },
                error: () => {
                    // Ignore errors; the restart may have already happened.
                }
            });
    }

    private startPolling(): void {
        // Check immediately on startup, then every 5 minutes.
        this.checkNow();

        interval(5 * 60 * 1000)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                switchMap(() => this.http.get<UpdateStatus>('/api/update/status').pipe(
                    catchError(() => [])
                ))
            )
            .subscribe((status: UpdateStatus | never[]) => {
                if (Array.isArray(status)) return;
                this.$currentVersion.set(status.currentVersion);
                this.$latestVersion.set(status.latestVersion);
                this.$updateAvailable.set(status.updateAvailable);
            });
    }
}

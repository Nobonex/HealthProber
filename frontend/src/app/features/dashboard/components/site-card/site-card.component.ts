import { Component, input, output, inject, DestroyRef, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { HealthStatus } from '@app/core/models/health-prober/health-status.enum';
import { ProbeResult } from '@app/core/models/health-prober/probe-result.model';
import { SiteConfig } from '@app/core/models/health-prober/site-config.model';
import { StatusIndicatorComponent } from '@app/shared/components/status-indicator/status-indicator.component';

@Component({
    selector: 'health-prober-site-card',
    imports: [
        NzButtonModule,
        NzCardModule,
        NzIconModule,
        NzPopconfirmModule,
        NzTooltipModule,
        StatusIndicatorComponent,
    ],
    templateUrl: './site-card.component.html',
    styleUrl: './site-card.component.less',
})
export class SiteCardComponent {
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    public readonly $site = input.required<SiteConfig>({ alias: 'site' });
    public readonly $results = input<ProbeResult[] | undefined>(undefined, { alias: 'results' });
    public readonly $status = input<HealthStatus | undefined>(undefined, { alias: 'status' });

    public readonly onEdit = output<SiteConfig>();
    public readonly onDelete = output<string>();

    protected readonly HealthStatus = HealthStatus;

    protected readonly $borderColor = computed(() => {
        switch (this.$status()) {
            case HealthStatus.Healthy:
                return 'var(--hp-success)';
            case HealthStatus.PartiallyOut:
                return 'var(--hp-warning)';
            case HealthStatus.EntirelyOut:
                return 'var(--hp-error)';
            default:
                return 'var(--hp-card-border)';
        }
    });

    private readonly $now = signal<number>(Date.now());

    protected readonly $latestResult = computed(() => {
        const results = this.$results();
        return results && results.length > 0 ? results[results.length - 1] : null;
    });

    protected readonly $lastCheckedText = computed(() => {
        const result = this.$latestResult();
        if (result === null) {
            return 'Never checked';
        }
        this.$now(); // dependency — re-evaluates when interval fires
        const seconds = Math.round((Date.now() - result.checkedAt) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
        return `${Math.round(seconds / 3600)}h ago`;
    });

    protected readonly $responseTimeColor = computed(() => {
        const result = this.$latestResult();
        if (!result || result.outcome === 'error' || result.outcome === 'timeout') {
            return 'var(--hp-error)';
        }
        const warning = this.$site().warningThresholdMs;
        const critical = this.$site().criticalThresholdMs;
        if (result.responseTimeMs >= critical) return 'var(--hp-error)';
        if (result.responseTimeMs >= warning) return 'var(--hp-warning)';
        return 'var(--hp-success)';
    });

    protected readonly $hasValidResponse = computed(() => {
        const result = this.$latestResult();
        return !!result && result.outcome !== 'error' && result.outcome !== 'timeout';
    });

    public constructor() {
        const interval = setInterval(() => {
            this.$now.set(Date.now());
        }, 1000);
        this.destroyRef.onDestroy(() => clearInterval(interval));
    }

    protected navigateToDetail(): void {
        this.router.navigate(['/sites', this.$site().id]);
    }

    protected edit(event: Event): void {
        event.stopPropagation();
        this.onEdit.emit(this.$site());
    }

    protected delete(event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        this.onDelete.emit(this.$site().id);
    }
}

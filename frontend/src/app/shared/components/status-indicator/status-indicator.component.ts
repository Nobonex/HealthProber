import { Component, computed, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { HealthStatus } from '@app/core/models/health-prober/health-status.enum';

@Component({
    selector: 'health-prober-status-indicator',
    imports: [NzIconModule, NzTooltipModule],
    templateUrl: './status-indicator.component.html',
    styleUrl: './status-indicator.component.less',
})
export class StatusIndicatorComponent {
    public readonly $status = input.required<HealthStatus>({ alias: 'status' });
    public readonly $isCors = input<boolean>(false, { alias: 'isCors' });
    public readonly $lastChecked = input<string | null>(null, { alias: 'lastChecked' });

    protected readonly HealthStatus = HealthStatus;

    protected readonly $statusClass = computed(() => {
        switch (this.$status()) {
            case HealthStatus.Healthy:
                return 'status-healthy';
            case HealthStatus.PartiallyOut:
                return 'status-partial';
            case HealthStatus.EntirelyOut:
                return 'status-out';
        }
    });

    protected readonly $statusIcon = computed(() => {
        switch (this.$status()) {
            case HealthStatus.Healthy:
                return 'check';
            case HealthStatus.PartiallyOut:
                return 'warning';
            case HealthStatus.EntirelyOut:
                return 'close';
        }
    });

    protected readonly $tooltipText = computed(() => {
        let text: string;
        switch (this.$status()) {
            case HealthStatus.Healthy:
                text = 'Healthy';
                break;
            case HealthStatus.PartiallyOut:
                text = 'Partially Out';
                break;
            case HealthStatus.EntirelyOut:
                text = 'Entirely Out';
                break;
        }
        if (this.$isCors()) {
            text += ' — Possible CORS restriction';
        }
        if (this.$lastChecked()) {
            text += ` (${this.$lastChecked()})`;
        }
        return text;
    });
}

import { Component, computed, inject, DestroyRef, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { PageHeaderService } from '@app/core/services/page-header.service';
import { SiteStorageService } from '@app/core/services/site-storage.service';
import { SiteHealthStateService } from '@app/core/services/site-health-state.service';
import { AuthStorageService } from '@app/core/services/auth-storage.service';
import { HealthStatus } from '@app/core/models/health-prober/health-status.enum';
import { SiteConfig } from '@app/core/models/health-prober/site-config.model';
import { StatusIndicatorComponent } from '@app/shared/components/status-indicator/status-indicator.component';
import { SiteFormModalComponent } from '@app/shared/components/site-form-modal/site-form-modal.component';

@Component({
    selector: 'health-prober-site-detail-page',
    imports: [
        NzButtonModule,
        NzCardModule,
        NzDescriptionsModule,
        NzEmptyModule,
        NzIconModule,
        NzPopconfirmModule,
        NzStatisticModule,
        NzTooltipModule,
        StatusIndicatorComponent,
    ],
    templateUrl: './site-detail-page.component.html',
    styleUrl: './site-detail-page.component.less',
})
export class SiteDetailPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly pageHeaderService = inject(PageHeaderService);
    private readonly siteStorage = inject(SiteStorageService);
    private readonly healthState = inject(SiteHealthStateService);
    private readonly authStorage = inject(AuthStorageService);
    private readonly modalService = inject(NzModalService);
    private readonly message = inject(NzMessageService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly $now = signal<number>(Date.now());

    protected readonly $site = computed(() => {
        const id = this.route.snapshot.paramMap.get('siteId');
        return this.siteStorage.$sites().find((s) => s.id === id) ?? null;
    });

    protected readonly $status = computed(() => {
        const site = this.$site();
        if (site === null) return HealthStatus.EntirelyOut;
        return this.healthState.$statuses()[site.id] ?? HealthStatus.EntirelyOut;
    });

    protected readonly $results = computed(() => {
        const site = this.$site();
        if (site === null) return [];
        return this.healthState.$results()[site.id] ?? [];
    });

    protected readonly $auth = computed(() => {
        const site = this.$site();
        if (site === null) return { type: 'none' as const };
        return this.authStorage.load(site.id);
    });

    protected readonly $latestResult = computed(() => {
        const results = this.$results();
        return results.length > 0 ? results[results.length - 1] : null;
    });

    protected readonly $lastCheckedText = computed(() => {
        const result = this.$latestResult();
        if (result === null) return 'Never';
        this.$now(); // dependency — re-evaluates when interval fires
        const seconds = Math.round((Date.now() - result.checkedAt) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        return `${Math.round(seconds / 60)}m ago`;
    });

    protected readonly HealthStatus = HealthStatus;

    public constructor() {
        const interval = setInterval(() => {
            this.$now.set(Date.now());
        }, 1000);
        this.destroyRef.onDestroy(() => clearInterval(interval));

        const site = this.$site();
        if (site !== null) {
            this.pageHeaderService.$title.set(site.name);
        }
        this.pageHeaderService.$backUrl.set('/dashboard');
        this.pageHeaderService.$renderBackButton.set(true);
    }

    protected refresh(): void {
        const site = this.$site();
        if (site !== null) {
            this.healthState.refreshSite(site.id);
            this.message.success('Site refreshed');
        }
    }

    protected edit(): void {
        const site = this.$site();
        if (site === null) return;

        const modalRef = this.modalService.create({
            nzTitle: 'Edit Site',
            nzContent: SiteFormModalComponent,
            nzWidth: 640,
            nzFooter: null,
            nzData: { site },
        });

        const instance = modalRef.getContentComponent();
        if (instance !== null) {
            instance.site = site;
        }

        modalRef.afterClose
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result: SiteConfig | undefined) => {
                if (result !== undefined) {
                    this.siteStorage.update(result);
                    this.message.success(`Site '${result.name}' updated`);
                }
            });
    }

    protected delete(): void {
        const site = this.$site();
        if (site === null) return;
        this.siteStorage.delete(site.id);
        this.authStorage.clear(site.id);
        this.message.success(`Site '${site.name}' deleted`);
        this.router.navigate(['/dashboard']);
    }

    protected goToDashboard(): void {
        this.router.navigate(['/dashboard']);
    }
}

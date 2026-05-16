import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { PageHeaderService } from '@app/core/services/page-header.service';
import { SiteStorageService } from '@app/core/services/site-storage.service';
import { SiteHealthStateService } from '@app/core/services/site-health-state.service';
import { AuthStorageService } from '@app/core/services/auth-storage.service';
import { HealthStatus } from '@app/core/models/health-prober/health-status.enum';
import { SiteConfig } from '@app/core/models/health-prober/site-config.model';
import { SiteCardComponent } from '../../components/site-card/site-card.component';
import { SiteFormModalComponent } from '@app/shared/components/site-form-modal/site-form-modal.component';

type SortOption = 'status' | 'name' | 'lastChecked';
type StatusFilter = 'all' | HealthStatus;

@Component({
    selector: 'health-prober-dashboard-page',
    imports: [
        FormsModule,
        NzButtonModule,
        NzEmptyModule,
        NzGridModule,
        NzIconModule,
        NzInputModule,
        NzSelectModule,
        NzTooltipModule,
        SiteCardComponent,
    ],
    templateUrl: './dashboard-page.component.html',
    styleUrl: './dashboard-page.component.less',
})
export class DashboardPageComponent {
    private readonly pageHeaderService = inject(PageHeaderService);
    protected readonly siteStorage = inject(SiteStorageService);
    protected readonly healthState = inject(SiteHealthStateService);
    private readonly authStorage = inject(AuthStorageService);
    private readonly modalService = inject(NzModalService);
    private readonly message = inject(NzMessageService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly $search = signal<string>('');
    protected readonly $sort = signal<SortOption>('status');
    protected readonly $statusFilter = signal<StatusFilter>('all');

    protected readonly HealthStatus = HealthStatus;

    protected readonly $sites = computed(() => {
        let sites = this.siteStorage.$sites();
        const search = this.$search().toLowerCase();
        const filter = this.$statusFilter();
        const sort = this.$sort();
        const statuses = this.healthState.$statuses();

        if (search) {
            sites = sites.filter(
                (s) =>
                    s.name.toLowerCase().includes(search) ||
                    s.endpoints[0]?.url.toLowerCase().includes(search),
            );
        }

        if (filter !== 'all') {
            sites = sites.filter((s) => (statuses[s.id] ?? HealthStatus.Healthy) === filter);
        }

        return [...sites].sort((a, b) => {
            if (sort === 'status') {
                const order = {
                    [HealthStatus.EntirelyOut]: 0,
                    [HealthStatus.PartiallyOut]: 1,
                    [HealthStatus.Healthy]: 2,
                };
                const diff = order[statuses[a.id] ?? HealthStatus.Healthy] - order[statuses[b.id] ?? HealthStatus.Healthy];
                if (diff !== 0) return diff;
                return a.name.localeCompare(b.name);
            }
            if (sort === 'name') {
                return a.name.localeCompare(b.name);
            }
            if (sort === 'lastChecked') {
                const resultsA = this.healthState.$results()[a.id] ?? [];
                const resultsB = this.healthState.$results()[b.id] ?? [];
                const lastA = resultsA[resultsA.length - 1]?.checkedAt ?? 0;
                const lastB = resultsB[resultsB.length - 1]?.checkedAt ?? 0;
                return lastB - lastA;
            }
            return 0;
        });
    });

    protected readonly $summary = computed(() => {
        const sites = this.siteStorage.$sites();
        const statuses = this.healthState.$statuses();
        const counts = {
            healthy: 0,
            partial: 0,
            out: 0,
            total: sites.length,
        };
        for (const site of sites) {
            const status = statuses[site.id] ?? HealthStatus.Healthy;
            if (status === HealthStatus.Healthy) counts.healthy++;
            else if (status === HealthStatus.PartiallyOut) counts.partial++;
            else counts.out++;
        }
        return counts;
    });

    public constructor() {
        this.pageHeaderService.$title.set('');
        this.pageHeaderService.$backUrl.set(null);
        this.pageHeaderService.$renderBackButton.set(false);
    }

    protected editSite(site: SiteConfig): void {
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

    protected deleteSite(id: string): void {
        const site = this.siteStorage.$sites().find((s) => s.id === id);
        this.siteStorage.delete(id);
        this.authStorage.clear(id);
        this.message.success(`Site '${site?.name ?? id}' deleted`);
    }

    protected refreshAll(): void {
        this.healthState.refreshAll();
        this.message.success('All sites refreshed');
    }

    protected onSearchInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.$search.set(value);
    }

    protected onSortChange(value: SortOption): void {
        this.$sort.set(value);
    }

    protected setStatusFilter(filter: StatusFilter): void {
        this.$statusFilter.set(filter);
    }

    protected getStatusLabel(status: HealthStatus): string {
        switch (status) {
            case HealthStatus.Healthy:
                return 'Healthy';
            case HealthStatus.PartiallyOut:
                return 'Partially Out';
            case HealthStatus.EntirelyOut:
                return 'Entirely Out';
        }
    }
}

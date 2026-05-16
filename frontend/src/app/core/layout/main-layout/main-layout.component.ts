import { Component, computed, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PageHeaderService } from '@app/core/services/page-header.service';
import { ThemeService } from '@app/core/services/theme.service';
import { SiteStorageService } from '@app/core/services/site-storage.service';
import { SiteConfig } from '@app/core/models/health-prober/site-config.model';
import { SiteFormModalComponent } from '@app/shared/components/site-form-modal/site-form-modal.component';

@Component({
    selector: 'health-prober-main-layout',
    templateUrl: './main-layout.component.html',
    imports: [
        RouterOutlet,
        RouterLink,
        NzButtonModule,
        NzIconModule,
        NzTooltipModule,
    ],
    styleUrls: ['./main-layout.component.less'],
})
export class MainLayoutComponent {
    private readonly router = inject(Router);
    private readonly pageHeaderService = inject(PageHeaderService);
    private readonly themeService = inject(ThemeService);
    private readonly siteStorage = inject(SiteStorageService);
    private readonly modalService = inject(NzModalService);
    private readonly message = inject(NzMessageService);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly $title = computed(() => this.pageHeaderService.$title());
    protected readonly $backUrl = computed(() => this.pageHeaderService.$backUrl());
    protected readonly $theme = this.themeService.$theme;

    protected toggleTheme(): void {
        this.themeService.toggle();
    }

    protected async navigateBack(): Promise<void> {
        const backUrl = this.pageHeaderService.$backUrl();
        if (backUrl !== null) {
            await this.router.navigateByUrl(backUrl);
        } else {
            history.back();
        }
    }

    protected addSite(): void {
        const modalRef = this.modalService.create({
            nzTitle: 'Add Site',
            nzContent: SiteFormModalComponent,
            nzWidth: 640,
            nzFooter: null,
        });

        modalRef.afterClose
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result: SiteConfig | undefined) => {
                if (result !== undefined) {
                    this.siteStorage.add(result);
                    this.message.success(`Site '${result.name}' saved successfully`);
                }
            });
    }
}

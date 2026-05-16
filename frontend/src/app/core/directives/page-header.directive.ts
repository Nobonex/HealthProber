import { Directive, effect, inject, input, OnDestroy } from '@angular/core';
import { UrlTree } from '@angular/router';
import { PageHeaderService } from '@app/core/services/page-header.service';

@Directive({
    selector: 'health-prober-page-header',
})
export class PageHeaderDirective implements OnDestroy {
    private readonly pageHeaderService = inject(PageHeaderService);

    public readonly $title = input.required<string>({ alias: 'title' });
    public readonly $backUrl = input<string | UrlTree | null>(null, { alias: 'backUrl' });
    public readonly $renderBackButton = input<boolean>(false, { alias: 'renderBackButton' });

    public constructor() {
        effect(() => {
            this.pageHeaderService.$title.set(this.$title());
        });

        effect(() => {
            this.pageHeaderService.$backUrl.set(this.$backUrl());
        });

        effect(() => {
            this.pageHeaderService.$renderBackButton.set(this.$renderBackButton());
        });
    }

    public ngOnDestroy(): void {
        this.pageHeaderService.reset();
    }
}

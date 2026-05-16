import { Injectable, signal } from '@angular/core';
import { UrlTree } from '@angular/router';

@Injectable({
    providedIn: 'root',
})
export class PageHeaderService {
    public readonly $title = signal<string | null>(null);
    public readonly $backUrl = signal<string | UrlTree | null>(null);
    public readonly $renderBackButton = signal<boolean>(false);

    public reset(): void {
        this.$title.set(null);
        this.$backUrl.set(null);
        this.$renderBackButton.set(false);
    }
}

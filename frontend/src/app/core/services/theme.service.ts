import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'healthprober-theme';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    public readonly $theme = signal<Theme>(this.load());

    public constructor() {
        effect(() => {
            const theme = this.$theme();
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(STORAGE_KEY, theme);
        });
    }

    public toggle(): void {
        this.$theme.update((t) => (t === 'light' ? 'dark' : 'light'));
    }

    private load(): Theme {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') {
            return stored;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
}

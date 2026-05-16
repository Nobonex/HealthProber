import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from '@app/app.routes';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { ThemeService } from '@app/core/services/theme.service';
import { IConfig } from '@app/core/config/config.interface';
import { CONFIG } from '@app/core/config/config-injection-token';
import { ApiInterceptor } from '@app/core/providers/interceptors/api-url.interceptor';
import { initApplicationInsights } from '@app/core/providers/telemetry/application-insights-provider';

export const appConfig = (config: IConfig): ApplicationConfig => {
    initApplicationInsights(config);
    return {
        providers: [
            ThemeService,
            { provide: NZ_I18N, useValue: en_US },
            {
                provide: CONFIG,
                useValue: config
            },
            provideZoneChangeDetection({ eventCoalescing: true }),
            provideRouter(routes, withComponentInputBinding()),
            importProvidersFrom(FormsModule, NzModalModule),
            provideHttpClient(withInterceptors([ApiInterceptor])),
        ]
    };
};

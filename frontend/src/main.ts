import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from '@app/app.component';
import { appConfig } from '@app/app.config';
import { IConfig } from '@app/core/config/config.interface';

const defaultConfig: IConfig = {
    apiBaseUrl: '',
    applicationInsightsConnectionString: ''
};

bootstrapApplication(AppComponent, appConfig(Object.freeze(defaultConfig)))
    .catch(err => console.error(err));

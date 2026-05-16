import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { IConfig } from '@app/core/config/config.interface';

export function initApplicationInsights(config: IConfig) {
    if (!config.applicationInsightsConnectionString) {
        console.warn('Application Insights is not configured. Telemetry will not be initialized.');
        return;
    }

    const appInsights = new ApplicationInsights({
        config: {
            connectionString: config.applicationInsightsConnectionString,
            enableAutoRouteTracking: true,
            enableUnhandledPromiseRejectionTracking: true,
            enableAjaxErrorStatusText: true,
            autoTrackPageVisitTime: true,
            enableCorsCorrelation: true,
        }
    });
    
    appInsights.loadAppInsights();
    appInsights.trackPageView();
}

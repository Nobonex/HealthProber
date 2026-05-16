import { HttpContextToken, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { CONFIG } from '@app/core/config/config-injection-token';

export const BypassApiUrl = new HttpContextToken(() => false);

const absoluteUrlRegEx = new RegExp('^(?:[a-z+]+:)?//', 'i');

export const ApiInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    if (req.context.get(BypassApiUrl) || absoluteUrlRegEx.test(req.url)) {
        return next(req);
    }
    const config = inject(CONFIG);

    if (!config.apiBaseUrl) {
        return next(req);
    }

    const baseUrl = config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
    const path = req.url.startsWith('/') && baseUrl.endsWith('/') ? req.url.slice(1) : req.url;
    return next(req.clone({ url: `${baseUrl}${path}` }));
}

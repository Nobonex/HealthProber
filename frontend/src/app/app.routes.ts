import { Routes } from '@angular/router';
import { MainLayoutComponent } from '@app/core/layout/main-layout/main-layout.component';
import { NotFoundPageComponent } from '@app/core/pages/not-found-page/not-found-page.component';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
    },
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('@app/features/dashboard/pages/dashboard-page/dashboard-page.component')
                    .then(m => m.DashboardPageComponent),
            },
            {
                path: 'sites/:siteId',
                loadComponent: () => import('@app/features/dashboard/pages/site-detail-page/site-detail-page.component')
                    .then(m => m.SiteDetailPageComponent),
            },
            {
                path: '404',
                component: NotFoundPageComponent,
            },
            {
                path: '**',
                redirectTo: '404',
            },
        ],
    },
];

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderDirective } from '@app/core/directives/page-header.directive';

@Component({
    selector: 'health-prober-not-found-page',
    imports: [
        PageHeaderDirective,
        RouterLink,
    ],
    templateUrl: './not-found-page.component.html',
})
export class NotFoundPageComponent {}

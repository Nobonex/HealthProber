import { Component, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SpinnerComponent } from '@app/shared/components/spinner/spinner.component';
import { TResult } from '@app/core/results';

@Component({
    selector: 'health-prober-suspense',
    templateUrl: './suspense.component.html',
    imports: [
        NgTemplateOutlet,
        SpinnerComponent,
    ],
    standalone: true,
    styleUrls: ['./suspense.component.less']
})
export class SuspenseComponent {
    public readonly $result = input.required<TResult<unknown>>();
    public readonly $ref = input<TemplateRef<unknown> | null>(null);
    public readonly $errorRef = input<TemplateRef<unknown> | null>(null);
}

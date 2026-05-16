import { Component, input } from '@angular/core';

@Component({
    selector: 'health-prober-spinner',
    templateUrl: './spinner.component.html',
    imports: [],
    standalone: true,
    styleUrls: ['./spinner.component.less'],
})
export class SpinnerComponent {
    public readonly $visible = input.required<boolean>();
}

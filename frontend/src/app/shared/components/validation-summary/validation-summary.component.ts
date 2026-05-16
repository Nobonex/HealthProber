import { Component, computed, input } from '@angular/core';
import { ApiError, TResult } from '@app/core/results';

@Component({
    selector: 'health-prober-validation-summary',
    templateUrl: './validation-summary.component.html',
    imports: [],
    standalone: true,
    styleUrls: ['./validation-summary.component.less']
})
export class ValidationSummaryComponent {
    public readonly $submitState = input.required<TResult<unknown, ApiError>>();
    protected readonly $validationMessages = computed(() =>
        this.$submitState().error?.validationFailures ?? []
    );
}

import { Component, computed, DestroyRef, inject, input } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';

@Component({
    selector: 'health-prober-validation-messages',
    templateUrl: './validation-messages.component.html',
    imports: [],
    standalone: true,
    styleUrls: ['./validation-messages.component.less'],
})
export class ValidationMessagesComponent {
    public readonly $control = input.required<AbstractControl>();

    private readonly destroyRef = inject(DestroyRef);
    private readonly $controlErrors = toSignal(
        toObservable(this.$control).pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap((control) =>
                control.statusChanges.pipe(
                    startWith(control.status),
                    map(() => control.errors)
                )
            )
        ),
        { initialValue: null }
    );

    protected readonly $errorMessages = computed(() => {
        const controlErrors = this.$controlErrors();
        if (!controlErrors) {
            return [];
        }
        return Object.keys(controlErrors).map((key) => this.getErrorMessage(key, controlErrors[key]));
    });

    private errorMessagesMap: Record<string, (error: unknown) => string> = {
        required: () => 'This field is required.',
        minlength: (error) => `Minimum length is ${this.getNumericErrorProperty(error, 'requiredLength')} characters.`,
        maxlength: (error) => `Maximum length is ${this.getNumericErrorProperty(error, 'requiredLength')} characters.`,
        email: () => 'Please enter a valid email address.',
        min: (error) => `Minimum value is ${this.getNumericErrorProperty(error, 'min')}.`,
        max: (error) => `Maximum value is ${this.getNumericErrorProperty(error, 'max')}.`,
        pattern: () => 'The input does not match the required pattern.',
    };

    private getErrorMessage(errorKey: string, errorValue: unknown): string {
        if (this.errorMessagesMap[errorKey]) {
            return this.errorMessagesMap[errorKey](errorValue);
        }
        return `Invalid field (${errorKey})`;
    }

    private getNumericErrorProperty(error: unknown, property: string): number {
        if (typeof error !== 'object' || error === null || !(property in error)) {
            return 0;
        }

        const value = (error as Record<string, unknown>)[property];
        return typeof value === 'number' ? value : 0;
    }
}

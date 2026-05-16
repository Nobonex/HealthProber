import {
    AfterViewInit,
    computed,
    DestroyRef,
    Directive,
    ElementRef,
    inject,
    input,
    inputBinding,
    output,
    signal,
    ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerComponent } from '@app/shared/components/spinner/spinner.component';
import { TResult, useResultState, withLoadingResultState } from '@app/core/results';
import { Observable } from 'rxjs';

/**
 * A directive that can be used on buttons to show a loading spinner and disable the button
 * while an async action is in progress. Supports two modes:
 *
 * **Action mode** — The directive owns the loading state. Provide a `[$action]` function
 * that returns an `Observable`. The directive intercepts the button click, subscribes, and
 * manages loading/disabled/spinner state automatically. Optionally listen to
 * `(onActionSuccess)` and `(onActionError)` to react to the result.
 *
 * **State mode** — The parent component owns the loading state. Provide a `[$state]`
 * `TResult` value. The directive simply reflects that state (disabled + spinner).
 * This is useful when the state is managed externally, e.g. form submissions.
 */
@Directive({
    selector: 'button[health-prober-loading-button]',
    host: {
        '[disabled]': '$isLoading()',
        '(click)': 'handleClick($event)',
    },
})
export class LoadingButtonDirective implements AfterViewInit {
    private readonly hostButton = inject<ElementRef<HTMLButtonElement>>(ElementRef);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Action mode: provide a function that returns an Observable.
     * The directive will call this on click and manage loading state internally.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly $action = input<() => Observable<any>>();

    /**
     * State mode: provide an externally managed TResult.
     * The directive will reflect this state (disabled + spinner) without handling clicks.
     */
    public readonly $state = input<TResult>();
    public readonly onActionSuccess = output<unknown>();
    public readonly onActionError = output<unknown>();

    private readonly $internalState = signal<TResult>(useResultState());

    protected readonly $isLoading = computed(() => {
        const externalState = this.$state();
        if (externalState) {
            return externalState.loading;
        }

        return this.$internalState().loading;
    });

    public ngAfterViewInit(): void {
        const spinnerComponent = this.viewContainerRef.createComponent(SpinnerComponent, {
            bindings: [inputBinding('$visible', this.$isLoading)],
        });

        this.hostButton.nativeElement.appendChild(spinnerComponent.location.nativeElement);
    }

    protected handleClick(event: MouseEvent): void {
        const action = this.$action();
        if (!action) {
            return;
        }

        event.stopPropagation();

        if (this.$isLoading()) {
            return;
        }

        action()
            .pipe(
                withLoadingResultState, 
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((result) => {
                this.$internalState.set(result);

                if (!result.loading && result.error == null) {
                    this.onActionSuccess.emit(result.data);
                } else if (!result.loading && result.error != null) {
                    this.onActionError.emit(result.error);
                }
            });
    }
}

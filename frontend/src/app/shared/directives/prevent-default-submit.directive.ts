import { Directive } from '@angular/core';

@Directive({
    selector: 'form[preventDefaultSubmit]',
    host: {
        '(submit)': 'onSubmit($event)',
    },
})
export class PreventDefaultSubmitDirective {
    protected onSubmit(event: SubmitEvent): void {
        event.preventDefault();
    }
}

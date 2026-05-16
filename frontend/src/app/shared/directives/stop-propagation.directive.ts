import { Directive } from '@angular/core';

@Directive({
    selector: '[stopPropagation]',
    host: {
        '(click)': 'onClick($event)',
    },
})
export class StopPropagationDirective {
    protected onClick(event: MouseEvent): void {
        event.stopPropagation();
    }
}

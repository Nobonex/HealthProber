import { HttpErrorResponse } from '@angular/common/http';

export type ApiError = {
    status: number;
    validationFailures: string[] | null;
    raw: HttpErrorResponse | null;
};

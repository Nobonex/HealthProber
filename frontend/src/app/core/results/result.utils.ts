import { TErrorResult, TResult, TSuccessResult } from './result.type';
import { catchError, map, Observable, of, startWith } from 'rxjs';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ApiError } from './api-error.type';

interface IValidationErrorDictionary {
    [key: string]: string[];
}

const normalizeHttpError = (error: unknown): ApiError => {
    if (error instanceof HttpErrorResponse) {
        const isValidation =
            error.status === HttpStatusCode.BadRequest ||
            error.status === HttpStatusCode.UnprocessableEntity;

        return {
            status: error.status,
            validationFailures: isValidation
                ? Object.values((error.error?.failures ?? {}) as IValidationErrorDictionary).flat()
                : null,
            raw: error,
        };
    }

    return { status: 0, validationFailures: null, raw: null };
};

/**
 * A utility function to create an initial empty state for a result with null data.
 * @returns A TResult object representing the initial empty state of an operation, with loading set to false, error set to null, and data set to null.
 */
export const useResultState = <T = unknown, TError = ApiError>(): TResult<T | null, TError> => useSuccessResultState<T | null>(null);

/**
 * A utility function to create an initial loading state for a result.
 * This function returns a TResult object with loading set to true, and both error and data set to null.
 * This is useful for initializing the state of an operation before it has completed, indicating that the operation is currently in progress.
 *
 * @param T - The type of the data that would be returned on a successful operation (default is unknown).
 * @param TError - The type of the error information returned on a failed operation (default is HttpErrorResponse).
 * @template T - The type of the data that would be returned on a successful operation (default is unknown).
 * @template TError - The type of the error information returned on a failed operation (default is HttpErrorResponse).
 * @returns A TResult object representing the loading state of an operation, with loading set to true, and both error and data set to null.
 */
export const useLoadingResultState = <T = unknown, TError = ApiError>(): TResult<T, TError> => ({
    loading: true,
    error: null,
    data: null,
});

/**
 * A utility function to create an error state for a result.
 * This function takes an error object as a parameter and returns a TResult object with loading set to false, the provided error, and data set to null.
 * This is useful for representing the state of an operation that has failed, containing the error information.
 *
 * @param TError - The type of the error information returned on a failed operation (default is HttpErrorResponse).
 * @returns A TResult object representing the error state of an operation, with loading set to false, the provided error, and data set to null.
 */
export const useErrorResultState = <TError = ApiError>(error: NonNullable<TError>): TErrorResult<TError> => ({
    loading: false,
    error,
    data: null,
});

/**
 * A utility function to create a success state for a result.
 * This function takes a data object as a parameter and returns a TResult object with loading set to false, error set to null, and the provided data.
 * This is useful for representing the state of an operation that has completed successfully, containing the resulting data.
 *
 * @param data - The data to be included in the success result.
 * @returns A TResult object representing the success state of an operation, with loading set to false, error set to null, and the provided data.
 */
export const useSuccessResultState = <T = unknown>(data: T): TSuccessResult<T> => ({
    loading: false,
    error: null,
    data,
});

export const withLoadingResultState =
    <T = unknown>(source: Observable<T>): Observable<TResult<T, ApiError>> =>
        source.pipe(
            map((data): TResult<T, ApiError> => useSuccessResultState(data)),
            startWith(useLoadingResultState<T, ApiError>()),
            catchError((error) => of(useErrorResultState<ApiError>(normalizeHttpError(error)))),
        );

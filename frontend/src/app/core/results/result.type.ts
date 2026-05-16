import { ApiError } from './api-error.type';

/**
 * Represents the loading state of an operation, where the operation is currently in progress.
 *
 * This type indicates that the operation has not yet completed, and therefore does not contain any data or error information.
 * The `data` property is set to null because there is no result available while loading, and the `error` property is also null because no error has occurred at this stage.
 *
 * @template T - The type of the data that would be returned on a successful operation (not applicable in loading state).
 */
export type TLoadingResult = {
  loading: true,
  error: null,
  data: null,
};

/**
 * Represents a successful result of an operation, containing the resulting data.
 * The `data` property can be of any type, and it is allowed to be null (e.g., for operations that return no content with a 201 status).
 *
 * @template T - The type of the data returned on a successful operation.
 */
export type TSuccessResult<T> = {
  loading: false,
  error: null,
  data: T | null,
};

/**
 * Represents an error result of an operation, containing error information.
 *
 * The `error` property is of type `TError`, which can be any type representing the error information (commonly an HttpErrorResponse).
 * The `data` property is set to null because there is no valid data when an error occurs.
 *
 * @template TError - The type of the error information returned on a failed operation.
 */
export type TErrorResult<TError> = {
  loading: false,
  error: NonNullable<TError>,
  data: null,
};

/**
 * Represents the result of an operation, which can be in one of three states: loading, success, or error.
 * - Loading: The operation is currently in progress.
 * - Success: The operation completed successfully and contains the resulting data.
 * - Error: The operation failed and contains error information.
 *
 * @template T - The type of the data returned on a successful operation.
 * @template TError - The type of the error information returned on a failed operation (default is ApiError).
 */
export type TResult<T = unknown, TError = ApiError> =
  TLoadingResult
  | TSuccessResult<T>
  | TErrorResult<TError>;

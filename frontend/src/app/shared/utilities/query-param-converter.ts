import { HttpParams } from '@angular/common/http';

export type QueryParamValue = string
    | number
    | Date
    | boolean
    | undefined
    | null;

export interface IEncodableQueryParams {
    [key: string]: QueryParamValue | QueryParamValue[]
}

const getRuntimeType = (value: unknown): string => {
    if (value === null) {
        return 'null';
    }

    if (value === undefined) {
        return 'undefined';
    }

    if (value instanceof Date) {
        return 'Date';
    }

    if (Array.isArray(value)) {
        return 'Array';
    }
    
    if (typeof value === 'object') {
        return value.constructor?.name ?? 'Object';
    }

    return typeof value;
};

const appendQueryParamValue = (params: HttpParams, key: string, value: QueryParamValue): HttpParams => {
    if (value === undefined || value === null) {
        return params;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return params.append(key, value.toString());
    }
    if (value instanceof Date) {
        return params.append(key, value.toISOString());
    }

    throw Error(`Type ${getRuntimeType(value)} is not supported to be appended to HttpParams`);
};

/**
 * Convert an object with properties of a primitive type, or of arrays of primitive types.
 * 
 * Example:
 * {
 *   property1: string,
 *   property2: number[]
 * }
 * 
 * We decided to not support arrays of complex types for now.
 */
export const toHttpParams = (obj: IEncodableQueryParams): HttpParams => {
    const httpParams = new HttpParams();
    return Object.keys(obj)
        .filter(key => obj[key] !== undefined && obj[key] !== null)
        .reduce((accumulatedHttpParams, key) => {
            const value = obj[key];
            if (Array.isArray(value)) {
                const valueArray = value as QueryParamValue[];
                return valueArray
                    .filter(x => x !== undefined && x !== null)
                    .reduce((accumulatedArrayHttpParams, arrayItemValue) => {
                        return appendQueryParamValue(accumulatedArrayHttpParams, key, arrayItemValue)
                }, accumulatedHttpParams)
            } 

            return appendQueryParamValue(accumulatedHttpParams, key, value);
        }, httpParams);
}

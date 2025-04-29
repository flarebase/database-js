import type DatabaseError from "./Error";

/**
 * Type alias for a Fetch function compatible with the Web Fetch API,
 */
export type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Base structure shared by all responses.
 */
interface ResponseBase {
    status: number
    statusText: string
}

/**
 * A successful database response, containing data.
 */
export interface ResponseSuccess<T> extends ResponseBase {
    data: T
}

/**
 * A mapping of error field names to an array of corresponding error messages.
 */
export type ErrorMessages = Record<string, string[]>;

/**
 * An error database response, containing an error object and no data.
 */
export interface ResponseError extends ResponseBase {
    error: DatabaseError
    data: null
}

/**
 * A response from the database operation which may either succeed or fail.
 */
export type SingleResponse<T> = ResponseSuccess<T> | ResponseError

/**
 * Generic structure of a database table, including its Row, Insert, and Update shapes.
 */
export type GenericTable = {
    Row: Record<string, unknown>
    Insert: Record<string, unknown>
    Update: Record<string, unknown>
}

/**
 * Generic representation of a database, mapping table names to their respective structures.
 */
export type GenericDatabase = {
    Tables: Record<string, GenericTable>
}

/**
 * Parses a comma-separated query string into a union of field names.
 *
 * Example:
 *   ParseQuery<'id,name'> => 'id' | 'name'
 */
type ParseQuery<Q extends string> =
    Q extends `${infer A},${infer Rest}`
    ? A | ParseQuery<Rest>
    : Q;

/**
 * Selects a subset of fields from a Row based on a given field name or names.
 */
type Project<Row, Fields extends string> =
    Fields extends keyof Row
    ? Pick<Row, Fields>
    : never;

/**
 * Utility type to determine the result shape when selecting fields from a row.
 *
 * - If `Query` is '*', returns the entire Row.
 * - Otherwise, picks only the specified fields from the Row.
 */
export type GetResult<
    Row extends Record<string, unknown>,
    Query extends string
> =
    Query extends '*'
    ? Row
    : Project<Row, ParseQuery<Query>>;

/**
 * Utility type that ensures that if one type uses keys from another, they are mutually exclusive.
 *
 * - Prevents a type from mixing fields between T and K.
 */
type Without<T, K> = {
    [P in Exclude<keyof T, keyof K>]?: never;
};

/**
 * Exclusive OR (XOR) between two types T and U.
 *
 * - Ensures that either T or U is used, but not both at the same time.
 * - Useful for APIs where options must be mutually exclusive.
 */
export type XOR<T, U> = (T | U) extends object
    ? (Without<T, U> & U) | (Without<U, T> & T)
    : T | U;

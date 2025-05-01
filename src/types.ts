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
 * Represents a successful database operation response.
 *
 * @template T - The shape of the response `data` payload.
 */
export interface ResponseSuccess<T> extends ResponseBase {
    error: null
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
 * Represents a union type of either a successful or failed database response.
 *
 * @template T - The shape of the response `data` if successful.
 */
export type SingleResponse<T> = ResponseSuccess<T> | ResponseError

/**
 * Describes a foreign key relationship between two database tables.
 */
export type GenericRelationship = {
    constraintName: string
    localColumns: string[]
    referencedTableName: string
    referencedColumns: string[]
    isOneToOne?: boolean
}

/**
 * Defines the structure of a database table, including row shapes for:
 * - Reading (`Row`)
 * - Inserting (`Insert`)
 * - Updating (`Update`)
 * - Optional foreign key relationships (`Relationships`)
 */
export type GenericTable = {
    Row: Record<string, unknown>
    Insert: Record<string, unknown>
    Update: Record<string, unknown>
    Relationships?: GenericRelationship[]
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
 * Utility type that removes any overlapping keys of `K` from `T`, ensuring type exclusivity.
 */
type Without<T, K> = {
    [P in Exclude<keyof T, keyof K>]?: never;
};

/**
 * Exclusive OR (XOR) utility type between two types `T` and `U`.
 *
 * Enforces that either `T` or `U` is used exclusively, not both.
 */
export type XOR<T, U> = (T | U) extends object
    ? (Without<T, U> & U) | (Without<U, T> & T)
    : T | U;

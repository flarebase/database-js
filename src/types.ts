import type DatabaseError from "./Error"

export type Fetch = (input: RequestInfo | URL, init?: RequestInit & { verbose?: boolean }) => Promise<Response>;

interface ResponseBase {
    status: number
    statusText: string
}

export interface ResponseSuccess<T> extends ResponseBase {
    error: null
    data: T
}

export type ErrorMessages = Record<string, string[]>;

export interface ResponseError extends ResponseBase {
    error: DatabaseError
    data: null
}

export type SingleResponse<T> = ResponseSuccess<T> | ResponseError

export type GenericRelationship = {
    foreignKeyName: string
    columns: string[]
    referencedTable: string
    referencedColumns: string[]
    isOneToOne?: boolean
}

export type GenericTable = {
    Row: Record<string, unknown>
    Insert: Record<string, unknown>
    Update: Record<string, unknown>
    Relationships?: GenericRelationship[]
}

export type GenericDatabase = {
    Tables: Record<string, GenericTable>
}

type ParseQuery<Q extends string> =
    Q extends `${infer A},${infer Rest}`
    ? A | ParseQuery<Rest>
    : Q;

type Project<Row, Fields extends string> =
    Fields extends keyof Row
    ? Pick<Row, Fields>
    : never;

export type GetResult<
    Row extends Record<string, unknown>,
    Query extends string
> =
    Query extends '*'
    ? Row
    : Project<Row, ParseQuery<Query>>;

// Without<T, K> ensures that if a type uses K, it can't use any of the keys from T
type Without<T, K> = {
    [P in Exclude<keyof T, keyof K>]?: never;
};

// XOR<T, U> ensures either T or U is used, but not both
export type XOR<T, U> = (T | U) extends object
    ? (Without<T, U> & U) | (Without<U, T> & T)
    : T | U;

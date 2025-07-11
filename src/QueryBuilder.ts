import type { Builder } from '.';
import type { Fetch, GenericDatabase, GenericTable, GetResult } from './types';
import { FilterBuilder } from '.';

/**
 * Provides query-building methods for a specific table in a typed database schema.
 *
 * @template Database - The database schema.
 * @template TableName - The name of the table being queried.
 * @template Table - The table being queried, including its Row, Insert, and Update types.
 * @template Relationships - The relationships defined in the database schema
 */
export default class QueryBuilder<
  Database extends GenericDatabase,
  TableName extends keyof Database['Tables'] & string,
  Table extends GenericTable = Database['Tables'][TableName],
  Relationships extends Table['Relationships'] = Table['Relationships'],
> {
  url: URL;
  headers: Record<string, string>;
  fetch?: Fetch;

  /**
   * Creates a new `QueryBuilder` instance.
   *
   * @param url - The base URL to use for the query.
   * @param options - Optional headers and fetch implementation.
   * @param options.headers - Optional headers to include in the request.
   * @param options.fetch - Optional fetch implementation to use for the request.
   */
  constructor(
    url: URL,
        {
            headers = {},
            fetch,
        }: {
          headers?: Record<string, string>;
          fetch?: Fetch;
        } = {},
  ) {
    this.url = new URL(url);
    this.headers = headers;
    this.fetch = fetch;
  };

  /**
   * Performs a `SELECT` query on the table.
   *
   * @param columns - A comma-separated list of columns to return, or `*` for all columns.
   * @returns A `FilterBuilder` to continue building the query.
   *
   * @example
   * ```ts
   * db.from('users').select('id,name')
   * db.from('posts').select('*')
   * ```
   */
  select<
    Columns extends string = '*',
    ResultOne = GetResult<Table['Row'], Columns>,
  >(
    columns?: Columns,
  ): FilterBuilder<Database, TableName, Table['Row'], ResultOne[], Relationships> {
    const method = 'GET';
    this.url = new URL(`${this.url}/query`);
    let quoted = false;
    const cleanedColumns = (columns ?? '*')
      .split('')
      .map((c) => {
        if (/\s/.test(c) && !quoted) {
          return '';
        }
        if (c === '"') {
          quoted = !quoted;
        }
        return c;
      })
      .join('');

    this.url.searchParams.set('columns', cleanedColumns);

    return new FilterBuilder({
      method,
      url: this.url,
      headers: this.headers,
      fetch: this.fetch,
    } as unknown as Builder<ResultOne[]>);
  }

  /**
   * Inserts one or more rows into the table.
   *
   * @param rows - A single row or an array of rows to insert.
   */
  insert<Row extends Table extends { Insert: unknown } ? Table['Insert'] : never>(
    rows: Row | Row[],
  ): FilterBuilder<Database, TableName, Table['Row'], Row[], Relationships> {
    const method = 'POST';
    this.url = new URL(`${this.url}/insert`);

    if (!Array.isArray(rows)) {
      rows = [rows];
    }

    return new FilterBuilder({
      method,
      url: this.url,
      headers: this.headers,
      body: { rows },
      fetch: this.fetch,
    } as unknown as Builder<Row[]>);
  }

  /**
   * Performs an upsert (insert or update on conflict) operation on the table.
   *
   * @param values - The rows to upsert.
   * @param options - Conflict resolution options.
   * @param options.onConflict - An array of column names to use for conflict detection.
   * @param options.ignoreDuplicates - If `true`, conflicting rows are ignored (`DO NOTHING`).
   */
  upsert<Row extends Table extends { Insert: unknown } ? Table['Insert'] : never>(
    values: Row | Row[],
        {
            onConflict,
            ignoreDuplicates,
        }: {
          onConflict?: (keyof Row)[];
          ignoreDuplicates?: boolean;
        } = {},
  ): FilterBuilder<Database, TableName, Table['Row'], Row[], Relationships> {
    const method = 'POST';
    this.url = new URL(`${this.url}/upsert`);

    const body = {
      rows: values,
      onConflict: onConflict ?? undefined,
      ignoreDuplicates: ignoreDuplicates ?? false,
    };

    return new FilterBuilder({
      method,
      url: this.url,
      headers: this.headers,
      body: { body },
      fetch: this.fetch,
    } as unknown as Builder<Row[]>);
  }

  /**
   * Updates one or more rows in the table.
   *
   * @param values - The partial row object with fields to update.
   * @returns A `FilterBuilder` to filter which rows are affected.
   */
  update<Row extends Table extends { Update: unknown } ? Table['Update'] : never>(
    values: Row,
  ): FilterBuilder<Database, TableName, Table['Row'], Row[], Relationships> {
    const method = 'PATCH';
    this.url = new URL(`${this.url}/update`);

    return new FilterBuilder({
      method,
      url: this.url,
      headers: this.headers,
      body: { row: values },
      fetch: this.fetch,
    } as unknown as Builder<Row[]>);
  }

  /**
   * Deletes rows from the table.
   *
   * @returns A `FilterBuilder` to filter which rows should be deleted.
   */
  delete(): FilterBuilder<Database, TableName, Table['Row'], Table['Row'], Relationships> {
    const method = 'DELETE';
    this.url = new URL(`${this.url}/delete`);

    return new FilterBuilder({
      method,
      url: this.url,
      headers: this.headers,
      fetch: this.fetch,
    } as unknown as Builder<Table['Row']>);
  }
}

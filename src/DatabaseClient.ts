import type { Fetch, GenericDatabase } from './types';
import QueryBuilder from './QueryBuilder';

/**
 * A generic client for querying a database using a structured query builder.
 *
 * This class provides a simple abstraction over HTTP-based database interactions,
 * allowing users to build type-safe queries against strongly typed database schemas.
 *
 * @template Database - A type extending `GenericDatabase` that defines the structure of available tables.
 */
export default class DatabaseClient<
  Database extends GenericDatabase = GenericDatabase,
> {
  /** The base URL of the database API. */
  url: string;

  /** HTTP headers to include with each request. */
  headers: Record<string, string>;

  /** Optional custom fetch implementation. */
  fetch?: Fetch;

  /**
   * Creates a new instance of `DatabaseClient`.
   *
   * @param url - The base URL for the database service.
   * @param options - Optional configuration for headers and a custom fetch function.
   * @param options.headers - Additional HTTP headers to send with each request.
   * @param options.fetch - Optional custom fetch implementation to use for requests.
   */
  constructor(
    url: string,
        {
            headers = {},
            fetch,
        }: {
          headers?: Record<string, string>;
          fetch?: Fetch;
        } = {},
  ) {
    this.url = url;
    this.headers = headers;
    this.fetch = fetch;
  }

  /**
   * Selects a table to start building a query.
   *
   * @param tableName - The name of the table to query.
   * @returns A `QueryBuilder` instance for chaining further query operations.
   *
   * @example
   * ```ts
   * const users = db.from("users").select("*");
   * ```
   */
  from<
    TableName extends keyof Database['Tables'] & string,
  >(
    tableName: TableName,
  ): QueryBuilder<Database, TableName, Database['Tables'][TableName], Database['Tables'][TableName]['Relationships']> {
    const url = new URL(`${this.url}/tables/${String(tableName)}`);

    return new QueryBuilder<
      Database,
      TableName,
      Database['Tables'][TableName],
      Database['Tables'][TableName]['Relationships']
    >(
      url,
      {
        headers: this.headers,
        fetch: this.fetch,
      },
    );
  }

  /**
   * Creates a new WebSocket connection to the database.
   *
   * @returns A `WebSocket` instance.
   */
  websocket(): WebSocket {
    const url = new URL(`${this.url}/websocket`);

    return new WebSocket(url.toString());
  }
}

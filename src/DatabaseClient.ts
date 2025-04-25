import QueryBuilder from "./QueryBuilder";
import type { Fetch, GenericDatabase } from "./types";

export default class DatabaseClient<
    Database extends GenericDatabase = GenericDatabase,
> {
    url: string;
    headers: Record<string, string>;
    fetch?: Fetch;

    constructor(
        url: string,
        {
            headers = {},
            fetch,
        }: {
            headers?: Record<string, string>;
            fetch?: Fetch;
        } = {}
    ) {
        this.url = url;
        this.headers = headers;
        this.fetch = fetch;
    }

    from<
        TableName extends keyof Database["Tables"],
        Table extends Database["Tables"][TableName],
    >(tableName: TableName): QueryBuilder<Database, TableName, Table> {
        const url = new URL(`${this.url}/tables/${String(tableName)}`);
        return new QueryBuilder<Database, TableName, Table>(url, {
            headers: this.headers,
            fetch: this.fetch,
        })
    }
}
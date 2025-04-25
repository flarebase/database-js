import { Builder, FilterBuilder } from "."
import type { Fetch, GenericDatabase, GenericTable, GetResult } from "./types"

export default class QueryBuilder<
    Database extends GenericDatabase,
    TableName extends keyof Database["Tables"],
    Table extends GenericTable,
> {
    url: URL
    headers: Record<string, string>
    fetch?: Fetch

    constructor(
        url: URL,
        {
            headers = {},
            fetch,
        }: {
            headers?: Record<string, string>
            fetch?: Fetch
        } = {}
    ) {
        this.url = new URL(url)
        this.headers = headers
        this.fetch = fetch
    }

    select<
        Columns extends string = '*',
        ResultOne = GetResult<Table['Row'], Columns>
    >(
        columns?: Columns,
    ): FilterBuilder<Database, Table["Row"], ResultOne[], TableName, Table["Relationships"]> {
        const method = 'GET'
        this.url = new URL(`${this.url}/query`)
        let quoted = false
        const cleanedColumns = (columns ?? '*')
            .split('')
            .map((c) => {
                if (/\s/.test(c) && !quoted) {
                    return ''
                }
                if (c === '"') {
                    quoted = !quoted
                }
                return c
            })
            .join('');

        this.url.searchParams.set('columns', cleanedColumns);

        return new FilterBuilder({
            method: method,
            url: this.url,
            headers: this.headers,
            fetch: this.fetch,
        } as unknown as Builder<ResultOne[]>)
    }

    // TODO: Bulk insert 
    insert<Row extends Table extends { Insert: unknown } ? Table["Insert"] : never>(
        row: Row,
    ): FilterBuilder<Database, Table["Row"], Row[], TableName, Table["Relationships"]> {
        const method = 'POST'
        this.url = new URL(`${this.url}/insert`)

        return new FilterBuilder({
            method: method,
            url: this.url,
            headers: this.headers,
            body: row,
            fetch: this.fetch,
        } as unknown as Builder<Row[]>)
    }
}
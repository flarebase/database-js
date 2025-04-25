import Builder from "./Builder";
import type { GenericDatabase, GetResult } from "./types";

export default class TransformBuilder<
    Database extends GenericDatabase,
    Row extends Record<string, unknown>,
    Result,
    TableName = unknown,
    Relationships = unknown,
> extends Builder<Result> {
    select<
        Columns extends string = "*",
        NewResultOne = GetResult<Row, Columns>,
    >(
        columns?: Columns,
    ): TransformBuilder<Database, Row, NewResultOne, TableName, Relationships> {
        this.url = new URL(`${this.url}/query`);
        let quoted = false;
        const cleanedColumns = (columns ?? "*")
            .split("")
            .map((c) => {
                if (/\s/.test(c) && !quoted) {
                    return "";
                }
                if (c === '"') {
                    quoted = !quoted;
                }
                return c;
            })
            .join("");
        this.url.searchParams.set("columns", cleanedColumns);
        return this as unknown as TransformBuilder<
            Database,
            Row,
            NewResultOne,
            TableName,
            Relationships
        >;
    }

    order(
        column: string,
        {
            ascending = true,
            nullsFirst,
        }: {
            ascending?: boolean;
            nullsFirst?: boolean;
        } = {},
    ): this {
        const existingOrder = this.url.searchParams.get("orderBy");

        this.url.searchParams.set(
            "orderBy",
            `${existingOrder ? `${existingOrder},` : ''}${column}.${ascending ? 'asc' : 'desc'}${nullsFirst === undefined ? '' : nullsFirst ? '.nullsfirst' : '.nullslast'}`
        );
        return this;
    }

    page(
        page: number,
        pageSize: number = 100,
    ): this {
        this.url.searchParams.set("page", `${page}`);
        this.url.searchParams.set("pageSize", `${pageSize}`);
        return this
    }
}

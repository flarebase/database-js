import Builder from "./Builder";
import type { GenericDatabase, GetResult } from "./types";

/**
 * TransformBuilder enables additional query transformations such as selecting specific columns,
 * ordering, and pagination. It extends `Builder` to inherit request construction and execution logic.
 *
 * @template Database - The database schema.
 * @template TableName - The name of the table being queried.
 * @template Row - The shape of each row in the selected table.
 * @template Result - The shape of the final query result.
 * @template Relationships - The relationships defined in the database schema.
 */
export default class TransformBuilder<
    Database extends GenericDatabase,
    TableName extends keyof Database["Tables"] & string,
    Row extends Database["Tables"][TableName]["Row"] = Database["Tables"][TableName]["Row"],
    Result = unknown,
    Relationships extends Database["Tables"][TableName]["Relationships"] = Database["Tables"][TableName]["Relationships"],
> extends Builder<Result> {
    select<
        Columns extends string = "*",
        NewResultOne = GetResult<Row, Columns>,
    >(
        columns?: Columns,
    ): TransformBuilder<Database, TableName, Row, NewResultOne, Relationships> {
        this.url = new URL(`${this.url}/query`);

        // Remove whitespace outside quoted identifiers
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

        return this as unknown as TransformBuilder<Database, TableName, Row, NewResultOne, Relationships>;
    }

    /**
     * Sort the query results by a specific column.
     *
     * @param column - The column to sort by.
     * @param options - Sorting options:
     *   - `ascending`: Sort direction (default: `true`)
     *   - `nullsFirst`: Control placement of `NULL` values
     *
     * @returns The current builder instance for chaining.
     *
     * @example
     * ```ts
     * query.order("created_at", { ascending: false, nullsFirst: true });
     * ```
     */
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
            `${existingOrder ? `${existingOrder},` : ''}${column}.${ascending ? 'asc' : 'desc'}${nullsFirst === undefined ? '' : nullsFirst ? '.nullsfirst' : '.nullslast'}`,
        );
        return this;
    }

    /**
     * Add pagination to the query.
     *
     * @param page - Page number (starts from 1).
     * @param pageSize - Number of rows per page (default: 100).
     * @returns The current builder instance for chaining.
     *
     * @example
     * ```ts
     * query.page(2, 50); // Page 2 with 50 items per page
     * ```
     */
    page(
        page: number,
        pageSize: number = 100,
    ): this {
        this.url.searchParams.set("page", `${page}`);
        this.url.searchParams.set("pageSize", `${pageSize}`);
        return this;
    }
}

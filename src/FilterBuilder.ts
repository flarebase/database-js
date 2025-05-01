import TransformBuilder from "./TransformBuilder";
import type { GenericDatabase, XOR } from "./types";

/**
 * Supported SQL comparison operators.
 */
type ComparisonOperator =
    | 'eq'   // Equal (=)
    | 'neq'  // Not equal (!=)
    | 'gt'   // Greater than (>)
    | 'gte'  // Greater than or equal (>=)
    | 'lt'   // Less than (<)
    | 'lte'  // Less than or equal (<=)
    | 'like' // SQL LIKE pattern
    | 'in'   // SQL IN clause
    | 'is'   // IS (e.g., IS NULL)
    | 'not'; // NOT (e.g., NOT TRUE)

/**
 * A single condition applied to a column, e.g. `{ age: { gte: 20 } }`.
 */
type SingleCondition = {
    [column: string]: {
        [operator in ComparisonOperator]?: unknown;
    };
};

/**
 * Represents a logical AND group of filter trees.
 */
type AndNode = { and: FilterTree[] };

/**
 * Represents a logical OR group of filter trees.
 */
type OrNode = { or: FilterTree[] };

/**
 * A filter tree can either be:
 * - A single condition (column operator comparison)
 * - A group of AND conditions
 * - A group of OR conditions
 * 
 * Only one of these can exist at the top level of any tree node.
 */
type FilterTree = XOR<XOR<AndNode, OrNode>, SingleCondition>;

/**
 * FilterBuilder enables constructing SQL-style `WHERE` clauses from nested condition trees.
 * 
 * @template Database - The generic database schema type.
 * @template TableName - The name of the table being queried.
 * @template Row - The shape of a row for the selected table.
 * @template Result - The final result type returned from the query.
 * @template Relationships - The relationships defined in the database schema.
 */
export default class FilterBuilder<
    Database extends GenericDatabase,
    TableName extends keyof Database["Tables"] & string,
    Row extends Record<string, unknown> = Database["Tables"][TableName]["Row"],
    Result = unknown,
    Relationships extends Database["Tables"][TableName]["Relationships"] = Database["Tables"][TableName]["Relationships"],
> extends TransformBuilder<Database, TableName, Row, Result, Relationships> {
    /**
     * Applies a filter condition tree to the query.
     * 
     * @param tree - The structured filter conditions using logical `and`, `or`, or field comparisons.
     * @returns The current builder instance for chaining.
     * 
     * @example
     * ```ts
     * // Expected WHERE Clause: age >= 65 OR (age >= 18 AND gender = 'M')
     * query.filter({
     *   or: [
     *     { age: { gte: 65 } },
     *     { and: [ 
     *       { age: { gte: 18 } }, 
     *       { gender: { eq: 'M' } } 
     *     ]}
     *   ]
     * })
     * ```
     */
    filter(tree: FilterTree): this {
        const where = this.buildFilter(tree);
        this.url.searchParams.append('where', where);
        return this;
    }

    /**
     * Converts the filter tree into a SQL-compatible `WHERE` string.
     *
     * @param tree - A structured representation of filter conditions.
     * @returns SQL expression string for the `WHERE` clause.
     */
    private buildFilter(tree: FilterTree): string {
        if (this.isAndNode(tree)) {
            return '(' + tree.and.map(sub => this.buildFilter(sub)).join(' AND ') + ')';
        }
        if (this.isOrNode(tree)) {
            return '(' + tree.or.map(sub => this.buildFilter(sub)).join(' OR ') + ')';
        }

        // Handle simple key-operator-value comparison
        return Object.entries(tree)
            .map(([column, ops]) =>
                Object.entries(ops)
                    .map(([op, val]) => this.buildExpression(column, op as ComparisonOperator, val))
                    .join(' AND ')
            )
            .join(' AND ');
    }

    /**
     * Builds an individual SQL comparison expression (e.g., `age >= 30`).
     *
     * @param column - The column name.
     * @param op - The comparison operator.
     * @param val - The value to compare against.
     */
    private buildExpression(column: string, op: ComparisonOperator, val: unknown): string {
        const operatorMap: Record<ComparisonOperator, string> = {
            eq: '=',
            neq: '!=',
            gt: '>',
            gte: '>=',
            lt: '<',
            lte: '<=',
            like: 'LIKE',
            in: 'IN',
            is: 'IS',
            not: 'NOT'
        };

        if (op === 'is') {
            return `${column} IS ${String(val).toUpperCase()}`;
        }

        if (op === 'not') {
            return `NOT ${column}`;
        }

        const sqlOp = operatorMap[op];
        const value = this.formatValue(op, val);
        return `${this.quoteIdentifier(column)} ${sqlOp} ${value}`;
    }

    private quoteIdentifier(identifier: string): string {
        // Handles dot notation like profiles.bio → "profiles"."bio"
        return identifier
            .split('.')
            .map(part => `"${part}"`)
            .join('.');
    }

    /**
     * Formats a value for safe inclusion in a SQL clause.
     *
     * @param op - The comparison operator.
     * @param val - The value to format.
     * @returns The SQL-encoded value.
     */
    private formatValue(op: ComparisonOperator, val: unknown): string {
        if (op === 'in' && Array.isArray(val)) {
            return `(${val.map(v => this.quote(v)).join(',')})`;
        }

        if (op === 'is') return String(val).toUpperCase();

        return this.quote(val);
    }

    /**
     * Safely quotes and escapes a value for SQL.
     *
     * @param val - The raw value.
     * @returns A SQL-safe string.
     */
    private quote(val: unknown): string {
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (val === null) return 'NULL';
        return String(val);
    }

    /**
     * Type guard: checks if a filter tree node is an `and` group.
     */
    private isAndNode(tree: FilterTree): tree is { and: FilterTree[] } {
        return typeof tree === 'object' && tree !== null && 'and' in tree;
    }

    /**
     * Type guard: checks if a filter tree node is an `or` group.
     */
    private isOrNode(tree: FilterTree): tree is { or: FilterTree[] } {
        return typeof tree === 'object' && tree !== null && 'or' in tree;
    }
}

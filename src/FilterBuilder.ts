import TransformBuilder from "./TransformBuilder";
import type { GenericDatabase, XOR } from "./types";

type ResolveFilterValue<
    Database extends GenericDatabase,
    Row extends Record<string, unknown>,
    ColumnName extends string,
> =
    ColumnName extends `${infer RelationshipTable}.${infer Remainder}`
    ? Remainder extends `${infer _}.${infer _}`
    ? ResolveFilterValue<Database, Row, Remainder>
    : ResolveFilterRelationshipValue<Database, RelationshipTable, Remainder>
    : ColumnName extends keyof Row
    ? Row[ColumnName]
    : unknown;

type ResolveFilterRelationshipValue<
    Database extends GenericDatabase,
    RelationshipTable extends string,
    RelationshipColumn extends string,
> =
    Database["Tables"] extends infer Tables
    ? RelationshipTable extends keyof Tables
    ? "Row" extends keyof Tables[RelationshipTable]
    ? RelationshipColumn extends keyof Tables[RelationshipTable]["Row"]
    ? Tables[RelationshipTable]["Row"][RelationshipColumn]
    : unknown
    : unknown
    : unknown
    : never;

// Supported operators
type ComparisonOperator =
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'in'
    | 'is'
    | 'not';

// A single condition like { age: { gte: 20 } }
type SingleCondition = {
    [column: string]: {
        [operator in ComparisonOperator]?: unknown;
    };
};

type AndNode = { and: FilterTree[] };
type OrNode = { or: FilterTree[] };

// Filter tree can be a combination of AND, OR, and single conditions but only one of them can be present at a time
type FilterTree = XOR<XOR<AndNode, OrNode>, SingleCondition>;

export default class FilterBuilder<
    Database extends GenericDatabase,
    Row extends Record<string, unknown>,
    Result,
    TableName = unknown,
    Relationships = unknown,
> extends TransformBuilder<Database, Row, Result, TableName, Relationships> {
    filter(tree: FilterTree): this {
        const where = this.buildFilter(tree);
        console.log("where", where);
        this.url.searchParams.append('where', where);
        return this;
    }

    private buildFilter(tree: FilterTree): string {
        if (this.isAndNode(tree)) {
            return '(' + tree.and.map(sub => this.buildFilter(sub)).join(' AND ') + ')';
        }
        if (this.isOrNode(tree)) {
            return '(' + tree.or.map(sub => this.buildFilter(sub)).join(' OR ') + ')';
        }

        // Handle simple comparison
        return Object.entries(tree)
            .map(([column, ops]) =>
                Object.entries(ops)
                    .map(([op, val]) => this.buildExpression(column, op as ComparisonOperator, val))
                    .join(' AND ')
            )
            .join(' AND ');
    }

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

        const sqlOp = operatorMap[op];
        const value = this.formatValue(op, val);
        return `${column} ${sqlOp} ${value}`;
    }

    private formatValue(op: ComparisonOperator, val: unknown): string {
        if (op === 'in' && Array.isArray(val)) {
            return `(${val.map(v => this.quote(v)).join(', ')})`;
        }
        return this.quote(val);
    }

    private quote(val: unknown): string {
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (val === null) return 'NULL';
        return String(val);
    }

    private isAndNode(tree: FilterTree): tree is { and: FilterTree[] } {
        return typeof tree === 'object' && tree !== null && 'and' in tree;
    }

    private isOrNode(tree: FilterTree): tree is { or: FilterTree[] } {
        return typeof tree === 'object' && tree !== null && 'or' in tree;
    }
}

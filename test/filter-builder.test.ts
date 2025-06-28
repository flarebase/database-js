import { describe, it, expect } from 'vitest';
import FilterBuilder from '../src/FilterBuilder';

class DummyFilterBuilder extends FilterBuilder<any, any, any> {
    constructor() {
        super({} as any);
        this.url = new URL('http://localhost');
        this.headers = {};
        this.method = 'GET';
        this.fetch = fetch;
    }

    getQuery() {
        return this.url.searchParams.get('where');
    }
}

describe('FilterBuilder - Query Building', () => {
    it('handles simple "eq" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ name: { eq: 'Alice' } });
        expect(fb.getQuery()).toBe("\"name\" = 'Alice'");
    });

    it('handle simple "neq" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ name: { neq: 'Alice' } });
        expect(fb.getQuery()).toBe("\"name\" != 'Alice'");
    });

    it('handle simple "gt" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ age: { gt: 18 } });
        expect(fb.getQuery()).toBe("\"age\" > 18");
    });

    it('handle simple "gte" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ age: { gte: 80 } });
        expect(fb.getQuery()).toBe("\"age\" >= 80");
    });

    it('handle simple "lt" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ age: { lt: 20 } });
        expect(fb.getQuery()).toBe("\"age\" < 20");
    });

    it('handle simple "lte" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ age: { lte: 25 } });
        expect(fb.getQuery()).toBe("\"age\" <= 25");
    });

    it('handles simple "like" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ name: { like: 'A%' } });
        expect(fb.getQuery()).toBe("\"name\" LIKE 'A%'");
    });

    it('handles simple "in" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ role: { in: ['admin', 'user'] } });
        expect(fb.getQuery()).toBe("\"role\" IN ('admin','user')");
    });

    it('handles simple "is" filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ active: { is: 'NULL' } });
        expect(fb.getQuery()).toBe("active IS NULL");
    });

    it('handles simple "not" filter', () => {
        const fb = new DummyFilterBuilder();2222
        fb.filter({ verified: { not: true } });
        expect(fb.getQuery()).toBe("NOT verified");
    });

    it('combines multiple conditions with AND', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            age: { gte: 18 },
            gender: { eq: 'M' },
        });
        expect(fb.getQuery()).toBe("\"age\" >= 18 AND \"gender\" = 'M'");
    });

    it('handles "neq" and "gt"', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            and: [
                { age: { gt: 18 } },
                { name: { neq: 'Bob' } },
            ]
        });
        expect(fb.getQuery()).toBe("\"age\" > 18 AND \"name\" != 'Bob'");
    });

    it('handles "like" and "in"', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            name: { like: 'A%' },
            role: { in: ['admin', 'user'] },
        });
        expect(fb.getQuery()).toBe("\"name\" LIKE 'A%' AND \"role\" IN ('admin','user')");
    });

    it('handles OR logic', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            or: [
                { age: { lt: 18 } },
                { age: { gt: 65 } },
            ]
        });
        expect(fb.getQuery()).toBe("(\"age\" < 18 OR \"age\" > 65)");
    });

    it('handles nested "or" with "and"', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            or: [
                { and: [{ age: { gte: 30 } }, { city: { eq: 'NYC' } }] },
                { age: { lt: 18 } }
            ]
        });
        expect(fb.getQuery()).toBe("((\"age\" >= 30 AND \"city\" = 'NYC') OR \"age\" < 18)");
    });

    it('handles "is" null and "not"', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            active: { is: 'NULL' },
            verified: { not: true },
        });
        expect(fb.getQuery()).toBe("active IS NULL AND NOT verified");
    });

    it('escapes single quotes in string values', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({ name: { eq: "O'Hara" } });
        expect(fb.getQuery()).toBe("\"name\" = 'O''Hara'");
    });

    it('returns null query for empty filter', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({});
        expect(fb.getQuery()).toBe("");
    });

    it('handles filter on joined table columns', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            'profiles.id': { eq: 1 },
            'profiles.bio': { like: '%developer%' }
        });
        expect(fb.getQuery()).toBe("\"profiles\".\"id\" = 1 AND \"profiles\".\"bio\" LIKE '%developer%'");
    });

    it('handles nested filter with joined table columns', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            or: [
                {
                    and: [
                        { age: { gte: 20 } },
                        { gender: { eq: 'M' } },
                        { 'profiles.bio': { like: '%developer%' } }
                    ]
                },
                { 'profiles.id': { eq: 99 } }
            ]
        });
        expect(fb.getQuery()).toBe("((\"age\" >= 20 AND \"gender\" = 'M' AND \"profiles\".\"bio\" LIKE '%developer%') OR \"profiles\".\"id\" = 99)");
    });

    it('handles deep nesting and all operators', () => {
        const fb = new DummyFilterBuilder();
        fb.filter({
            and: [
                { status: { eq: 'active' } },
                {
                    or: [
                        { score: { gte: 90 } },
                        { score: { lt: 50 } },
                        {
                            and: [
                                { group: { in: ['A', 'B'] } },
                                { flagged: { not: false } },
                            ]
                        }
                    ]
                },
                { name: { like: '%son' } },
                { comment: { is: 'NULL' } },
            ]
        });

        expect(fb.getQuery()).toBe(
            "(\"status\" = 'active' AND (\"score\" >= 90 OR \"score\" < 50 OR (\"group\" IN ('A','B') AND NOT flagged)) AND \"name\" LIKE '%son' AND comment IS NULL)"
        );
    });
});

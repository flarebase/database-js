import DatabaseError from "./Error";
import type { Fetch, ResponseSuccess, SingleResponse } from "./types";

export default abstract class Builder<
    Result,
    ThrowOnError extends boolean = false,
> implements
    PromiseLike<
        ThrowOnError extends true
        ? ResponseSuccess<Result>
        : SingleResponse<Result>
    > {
    protected method: 'GET' | 'POST'
    protected url: URL
    protected headers: Record<string, string>
    protected body?: unknown
    protected shouldThrowOnError = false
    protected signal?: AbortSignal
    protected fetch: Fetch

    constructor(builder: Builder<Result>) {
        this.method = builder.method
        this.url = builder.url
        this.headers = builder.headers
        this.body = builder.body
        this.shouldThrowOnError = builder.shouldThrowOnError
        this.signal = builder.signal
        this.fetch = builder.fetch
    }

    throwOnError(): this & Builder<Result, true> {
        this.shouldThrowOnError = true
        return this as this & Builder<Result, true>
    }

    setHeader(name: string, value: string): this {
        this.headers = { ...this.headers }
        this.headers[name] = value
        return this
    }

    then<
        Result1 = ThrowOnError extends true
        ? ResponseSuccess<Result>
        : SingleResponse<Result>,
        Result2 = never
    >(
        onfulfilled?:
            | ((
                value: ThrowOnError extends true
                    ? ResponseSuccess<Result>
                    : SingleResponse<Result>
            ) => Result1 | PromiseLike<Result1>)
            | undefined
            | null,
        onrejected?: ((reason: any) => Result2 | PromiseLike<Result2>) | undefined | null,
    ): PromiseLike<Result1 | Result2> {
        if (this.method !== 'GET') {
            this.headers['Content-Type'] = 'application/json';
        }

        let transformedBody = this.body
        if (this.method === 'POST' && this.url.pathname.endsWith('/insert')) {
            transformedBody = { row: this.body }
        }

        const _fetch = this.fetch
        let res = _fetch(this.url.toString(), {
            method: this.method,
            headers: this.headers,
            body: JSON.stringify(transformedBody),
            signal: this.signal,
            // verbose: true,
        }).then(async (res) => {
            let error = null
            let data = null
            const status = res.status
            const statusText = res.statusText

            if (res.ok) {
                const bodyText = await res.text()
                if (bodyText) {
                    try {
                        data = JSON.parse(bodyText)
                    } catch {
                        data = bodyText
                    }
                }
            } else {
                const bodyText = await res.text()
                try {
                    error = JSON.parse(bodyText)
                } catch {
                    error = { message: bodyText }
                }

                if (this.shouldThrowOnError) {
                    throw new DatabaseError(error)
                }
            }

            return {
                error,
                data,
                status,
                statusText,
            }
        })

        if (!this.shouldThrowOnError) {
            res = res.catch((fetchError) => ({
                error: {
                    message: `${fetchError?.name ?? 'FetchError'}: ${fetchError?.message}`,
                    details: `${fetchError?.stack ?? ''}`,
                    code: `${fetchError?.code ?? ''}`,
                },
                data: null,
                status: 0,
                statusText: '',
            }))
        }

        return res.then(onfulfilled, onrejected)
    }
}

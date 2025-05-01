import DatabaseError from "./Error";
import type { Fetch, ResponseSuccess, SingleResponse } from "./types";

/**
 * A base class for building and executing HTTP requests in a fluent, promise-like style.
 * It abstracts request handling, error formatting, and data extraction.
 *
 * @template Result - The shape of the expected response data.
 * @template ThrowOnError - Whether to throw an error on request failure. Defaults to `false`.
 */
export default abstract class Builder<
    Result,
    ThrowOnError extends boolean = false,
> implements
    PromiseLike<
        ThrowOnError extends true
        ? ResponseSuccess<Result>
        : SingleResponse<Result>
    > {
    protected method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    protected url: URL
    protected headers: Record<string, string>
    protected body?: unknown
    protected shouldThrowOnError = false
    protected signal?: AbortSignal
    protected fetch: Fetch

    /**
     * Copies the configuration from another Builder instance.
     *
     * @param builder - The source builder instance to clone.
     */
    constructor(builder: Builder<Result>) {
        this.method = builder.method
        this.url = builder.url
        this.headers = builder.headers
        this.body = builder.body
        this.shouldThrowOnError = builder.shouldThrowOnError
        this.signal = builder.signal
        this.fetch = builder.fetch
    }

    /**
     * Enables throwing an exception on API error responses (non-2xx).
     *
     * @returns A new builder instance with updated type to reflect throwing behavior.
     *
     * @example
     * ```ts
     * const result = await builder.throwOnError();
     * ```
     */
    throwOnError(): this & Builder<Result, true> {
        this.shouldThrowOnError = true
        return this as this & Builder<Result, true>
    }

    /**
     * Set or override an HTTP header.
     *
     * @param name - Header name.
     * @param value - Header value.
     * @returns The current builder instance for chaining.
     */
    setHeader(name: string, value: string): this {
        this.headers = { ...this.headers }
        this.headers[name] = value
        return this
    }

    /**
     * Executes the request and handles response formatting.
     * This makes the builder `await`-able like a promise.
     *
     * @template Result1 - Return type on fulfilled.
     * @template Result2 - Return type on rejected.
     *
     * @param onfulfilled - Callback when the request succeeds.
     * @param onrejected - Callback when the request fails.
     * @returns A `PromiseLike` resolving to a response object or throwing an error.
     */
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

        const _fetch = this.fetch
        let res = _fetch(this.url.toString(), {
            method: this.method,
            headers: this.headers,
            body: JSON.stringify(this.body),
            signal: this.signal,
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

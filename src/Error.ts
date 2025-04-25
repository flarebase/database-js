import type { ErrorMessages } from "./types";

export default class DatabaseError extends Error {
    errors: ErrorMessages;

    constructor(
        message: string,
        errors: ErrorMessages = {},
    ) {
        super(message);
        this.name = "DatabaseError";
        this.errors = errors;
    }
}
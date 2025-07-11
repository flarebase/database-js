import type { ErrorMessages } from './types';

/**
 * Represents a structured error returned by the database or API.
 * Wraps the error message and optional field-level error details.
 */
export default class DatabaseError extends Error {
  errors: ErrorMessages;

  constructor(
    message: string,
        errors: ErrorMessages = {},
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.errors = errors;
  }
}

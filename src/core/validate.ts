// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { EdValidationError } from './errors';

export function assertNonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new EdValidationError(
      `${name} must be a non-empty string, got ${typeof value}`,
      'INVALID_ARGUMENT',
    );
  }
}

export function assertPositiveNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new EdValidationError(
      `${name} must be a positive number, got ${JSON.stringify(value)}`,
      'INVALID_ARGUMENT',
    );
  }
}

export function assertNonEmptyArray(value: unknown, name: string): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new EdValidationError(
      `${name} must be a non-empty array, got ${JSON.stringify(value)}`,
      'INVALID_ARGUMENT',
    );
  }
}

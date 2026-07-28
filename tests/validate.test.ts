// © 2026 typeof (Scolup) | Licensed under AGPL 3.
import { describe, it, expect } from 'bun:test';
import {
  assertNonEmptyString,
  assertPositiveNumber,
  assertNonEmptyArray,
} from '../src/core/validate';
import { EdApiError } from '../src/core/errors';

describe('Validate Module', () => {
  describe('assertNonEmptyString', () => {
    it('passes for valid strings', () => {
      expect(() => assertNonEmptyString('hello', 'test')).not.toThrow();
    });
    it('throws for empty string', () => {
      expect(() => assertNonEmptyString('', 'test')).toThrow(EdApiError);
    });
    it('throws for whitespace-only string', () => {
      expect(() => assertNonEmptyString('   ', 'test')).toThrow(EdApiError);
    });
    it('throws for non-string', () => {
      expect(() => assertNonEmptyString(123, 'test')).toThrow(EdApiError);
    });
    it('throws for null', () => {
      expect(() => assertNonEmptyString(null, 'test')).toThrow(EdApiError);
    });
  });

  describe('assertPositiveNumber', () => {
    it('passes for positive numbers', () => {
      expect(() => assertPositiveNumber(1, 'test')).not.toThrow();
      expect(() => assertPositiveNumber(0.5, 'test')).not.toThrow();
    });
    it('throws for zero', () => {
      expect(() => assertPositiveNumber(0, 'test')).toThrow(EdApiError);
    });
    it('throws for negative', () => {
      expect(() => assertPositiveNumber(-1, 'test')).toThrow(EdApiError);
    });
    it('throws for Infinity', () => {
      expect(() => assertPositiveNumber(Infinity, 'test')).toThrow(EdApiError);
    });
    it('throws for non-number', () => {
      expect(() => assertPositiveNumber('1', 'test')).toThrow(EdApiError);
    });
  });

  describe('assertNonEmptyArray', () => {
    it('passes for non-empty arrays', () => {
      expect(() => assertNonEmptyArray([1], 'test')).not.toThrow();
    });
    it('throws for empty array', () => {
      expect(() => assertNonEmptyArray([], 'test')).toThrow(EdApiError);
    });
    it('throws for non-array', () => {
      expect(() => assertNonEmptyArray('not an array', 'test')).toThrow(EdApiError);
    });
  });
});
// © 2026 typeof (Scolup) | Licensed under AGPL 3.

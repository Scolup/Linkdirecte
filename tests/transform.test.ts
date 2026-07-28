// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect } from 'bun:test';
import { transform, decodeBase64, safeDecodeBase64 } from '../src/core/transform';

describe('Transform Module', () => {
  describe('decodeBase64', () => {
    it('decodes valid base64', () => {
      expect(decodeBase64(btoa('hello'))).toBe('hello');
    });
    it('handles UTF-8 characters', () => {
      const input = 'café résumé';
      const encoded = btoa(unescape(encodeURIComponent(input)));
      expect(decodeBase64(encoded)).toBe(input);
    });
  });

  describe('safeDecodeBase64', () => {
    it('returns short strings as-is if not valid base64', () => {
      expect(safeDecodeBase64('hi')).toBe('hi');
    });
    it('decodes valid base64 strings', () => {
      const long = 'a'.repeat(25);
      const encoded = btoa(long);
      expect(safeDecodeBase64(encoded)).toBe(long);
    });
    it('returns invalid base64 as-is gracefully', () => {
      expect(safeDecodeBase64('!!!not-base64!!!')).toBe('!!!not-base64!!!');
    });
  });

  describe('transform', () => {
    it('preserves keys and does not rename them', () => {
      const result = transform({ valeur: '15', noteSur: '20' });
      expect(result).toEqual({ valeur: '15', noteSur: '20' });
    });

    it('does not coerce boolean fields from 0/1 strings', () => {
      const result = transform({
        interrogation: '1',
        enLettre: '0',
      });
      expect(result.interrogation).toBe('1');
      expect(result.enLettre).toBe('0');
    });

    it('converts date strings to Date objects', () => {
      const result = transform({ dateSaisie: '2023-10-15' } as any);
      expect(result.dateSaisie).toBeInstanceOf(Date);
    });

    it('converts datetime strings to Date objects', () => {
      const result = transform({ start_date: '2023-10-15 08:30' } as any);
      expect(result.start_date).toBeInstanceOf(Date);
    });

    it('preserves null for any fields', () => {
      const result = transform({
        moyenne: null,
        valeur: null,
        val: null,
        foo: null,
      } as any);
      expect(result.moyenne).toBeNull();
      expect(result.valeur).toBeNull();
      expect(result.val).toBeNull();
      expect(result.foo).toBeNull();
    });

    it('transforms nested objects recursively', () => {
      const result = transform({
        notes: [{ valeur: '15', noteSur: '20' }],
      } as any);
      expect(result.notes[0].valeur).toBe('15');
      expect(result.notes[0].noteSur).toBe('20');
    });

    it('handles empty arrays', () => {
      expect(transform([])).toEqual([]);
    });

    it('handles empty objects', () => {
      expect(transform({})).toEqual({});
    });

    it('handles null/undefined input', () => {
      expect(transform(null)).toBeNull();
      expect(transform(undefined)).toBeUndefined();
    });

    it('returns primitives unchanged', () => {
      expect(transform('hello')).toBe('hello');
      expect(transform(42)).toBe(42);
      expect(transform(true)).toBe(true);
    });

    it('handles Date objects by returning them as-is', () => {
      const d = new Date('2023-01-01');
      expect(transform(d)).toBe(d);
    });

    it('decodes specific keys automatically', () => {
      const result = transform({
        question: btoa('test question'),
        enonce: btoa('test enonce'),
        contenu: btoa('test contenu'),
        content: btoa('test content'),
        message: btoa('test message'),
        libelleEval1: btoa('test libelleEval1'),
      });
      expect(result.question).toBe('test question');
      expect(result.enonce).toBe('test enonce');
      expect(result.contenu).toBe('test contenu');
      expect(result.content).toBe('test content');
      expect(result.message).toBe('test message');
      expect(result.libelleEval1).toBe('test libelleEval1');
    });

    it('decodes propositions array of strings automatically', () => {
      const result = transform({
        propositions: [btoa('choice1'), btoa('choice2')],
      });
      expect(result.propositions).toEqual(['choice1', 'choice2']);
    });
  });
});

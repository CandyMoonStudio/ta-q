import { describe, it, expect } from 'vitest';
import { normalize } from './normalize.js';

describe('normalize', () => {
    it('should return empty string for null or undefined', () => {
        expect(normalize(null)).toBe('');
        expect(normalize(undefined)).toBe('');
    });

    it('should trim and collapse spaces', () => {
        expect(normalize('  Hello   World  ')).toBe('hello world');
    });

    it('should convert full-width alphanumeric to half-width', () => {
        expect(normalize('１２３ＡＢＣａｂｃ')).toBe('123abcabc');
    });

    it('should handle mixed input', () => {
        expect(normalize('  Full  Ｗｉｄｔｈ  123  ')).toBe('full width 123');
    });
});

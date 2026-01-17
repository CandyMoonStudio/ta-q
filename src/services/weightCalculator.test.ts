import { describe, it, expect } from 'vitest';
import { computeWeight } from './weightCalculator.js';

describe('computeWeight', () => {
    // Helper to create minimal question object
    const createQ = (answer: string) => ({
        id: '1', text: 'Q', answer: answer, // field for display validation (raw)
        // computeWeight uses normalize(answer), so we rely on that.
        // Or does it use normalizedAnswer field?
        // Implementation: normalize(question.answer || "")
        // So we just need answer field.
    } as any);

    it('should calculate weight based on length', () => {
        // "tokyo" -> length 5. Weight = 5 / 5 = 1.0
        expect(computeWeight(createQ('tokyo'))).toBe(1.0);
    });

    it('should boost weight for numbers', () => {
        // "1" -> length 1. 
        // Base weight = 1. 
        // Contains number (+0.5). Total 1.5.
        // 1.5 / 5 = 0.3.
        // Min clip at 0.5.
        expect(computeWeight(createQ('1'))).toBe(0.5); // calculated 0.3 -> clipped 0.5

        // "123" -> length 3. +0.5 = 3.5. /5 = 0.7.
        expect(computeWeight(createQ('123'))).toBe(0.7);
    });

    it('should boost weight for symbols', () => {
        // "a-b" -> length 3.
        // Contains symbol (+0.5). Total 3.5. /5 = 0.7.
        expect(computeWeight(createQ('a-b'))).toBe(0.7);
    });

    it('should handle full width chars by normalizing', () => {
        // "ＡＢＣ" -> "abc" (length 3).
        // 3 / 5 = 0.6.
        expect(computeWeight(createQ('ＡＢＣ'))).toBe(0.6);
    });
});

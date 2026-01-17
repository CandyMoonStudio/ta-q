import { describe, it, expect, beforeEach } from 'vitest';
import { validateQuestion, resetValidator } from './validator.js';

describe('validateQuestion', () => {
    beforeEach(() => {
        resetValidator();
    });

    it('should validate a valid question', () => {
        const raw = {
            id: '1',
            text: 'Question?',
            answer: 'Answer',
            status: 'prod'
        };
        const result = validateQuestion(raw, 0);
        expect(result.ok).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.question.id).toBe('1');
    });

    it('should report missing fields', () => {
        const raw = { id: '' };
        const result = validateQuestion(raw, 0);
        expect(result.ok).toBe(false);
        expect(result.errors).toContain('missing_id');
        expect(result.errors).toContain('missing_text');
        expect(result.errors).toContain('missing_answer');
    });

    it('should normalize answer', () => {
        const raw = {
            id: '1',
            text: 'Q',
            answer: ' ＡＢＣ '
        };
        const result = validateQuestion(raw, 0);
        expect(result.question.normalizedAnswer).toBe('abc');
    });

    it('should detect duplicate IDs', () => {
        const q1 = { id: '1', text: 'Q1', answer: 'A1' };
        validateQuestion(q1, 0);

        const q2 = { id: '1', text: 'Q2', answer: 'A2' };
        const result = validateQuestion(q2, 1);

        expect(result.errors).toContain('dup_id');
    });

    it('should detect duplicate Text+Answer', () => {
        const q1 = { id: '1', text: 'Q', answer: 'A' };
        validateQuestion(q1, 0);

        const q2 = { id: '2', text: 'Q', answer: 'A' };
        const result = validateQuestion(q2, 1);

        expect(result.errors).toContain('dup_text_answer');
    });
});

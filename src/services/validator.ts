import { z } from 'zod';
import { normalize } from '../utils/normalize.js';

// Define the Question Schema using Zod
// TSV parsing results in strings for all fields, so we start with strings.
export const QuestionSchema = z.object({
    id: z.string()
        .min(1, { message: "missing_id" })
        .regex(/^[a-zA-Z0-9_-]+$/, { message: "invalid_id_format" }),
    text: z.string().min(1, { message: "missing_text" }),
    answer: z.string().min(1, { message: "missing_answer" }),
    aliases: z.string().optional(),
    romaji: z.string().optional(),

    // Status defaults to 'inbox' if empty, but here we validate raw input
    status: z.string().optional(),

    type: z.string().optional(),
    tags: z.string().optional(),
    source: z.string().optional(),
    answer_display: z.string().optional(),
    reading: z.string().optional(),
    explanation: z.string().optional(),

    // Internal/System fields often added later, but schema might see them if passed
    weight: z.number().optional()
});

// Derived Type
export type Question = z.infer<typeof QuestionSchema> & {
    // Add extra fields that might be computed during processing
    _index?: number;
    normalizedAnswer?: string;
};

export interface ValidationResult {
    ok: boolean;
    errors: string[];
    question: Question;
}

const seenIds = new Set<string>();
const seenTextAnswer = new Set<string>();

export function resetValidator() {
    seenIds.clear();
    seenTextAnswer.clear();
}

/**
 * Validates and normalizes a question record.
 * - Checks required fields
 * - Checks for duplicates (ID, Text+Answer)
 * - Validates specific constraints
 */
export function validateQuestion(raw: Record<string, any>, index: number): ValidationResult {
    const errors: string[] = [];

    // 1. Basic Schema Validation (Required fields)
    // We manually handle empty strings as missing for TSV data
    const id = String(raw.id || "").trim();
    const text = String(raw.text || "").trim();
    const answer = String(raw.answer || "").trim();

    if (!id) errors.push("missing_id");
    if (!text) errors.push("missing_text");
    if (!answer) errors.push("missing_answer");

    const normalizedAnswer = normalize(answer);
    if (!normalizedAnswer) {
        // Only push error if answer was present but normalized to empty (e.g. only symbols that got stripped?)
        // Actually normalize() returns empty if input is empty, which is already covered by missing_answer.
        // But if input was "   ", missing_answer covers it.
        // If input was "！", normalize might return ""? No, normalize keeps empty if input is null.
        // Let's keep logic similar to original:
        if (answer && normalizedAnswer.length === 0) {
            errors.push("normalized_answer_empty");
        }
    }

    // 2. Duplicate Checks
    if (id) {
        if (seenIds.has(id)) {
            errors.push("dup_id");
        }
        seenIds.add(id);
    }

    if (text && answer) {
        const key = `${text}\u0000${answer}`;
        if (seenTextAnswer.has(key)) {
            errors.push("dup_text_answer");
        }
        seenTextAnswer.add(key);
    }

    // 3. Construct Normalized Object
    const q: Question = {
        id,
        text,
        answer,
        aliases: String(raw.aliases || "").trim(),
        tags: String(raw.tags || "").trim(),
        status: String(raw.status || "inbox").trim(),

        romaji: String(raw.romaji || "").trim(),
        type: String(raw.type || "").trim(),
        source: String(raw.source || "").trim(),
        answer_display: String(raw.answer_display || "").trim(),
        reading: String(raw.reading || "").trim(),
        explanation: String(raw.explanation || "").trim(),

        _index: index,
        normalizedAnswer
    };

    return {
        ok: errors.length === 0,
        errors,
        question: q
    };
}

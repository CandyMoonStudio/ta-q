import { normalize } from '../utils/normalize.js';
import type { Question } from './validator.js';

export function computeWeight(question: Question): number {
    const normalizedAnswer = normalize(question.answer || "");
    const base = normalizedAnswer.length;
    let weight = base;

    // Boost weight for numbers (often harder or distinct)
    if (/[0-9]/.test(normalizedAnswer)) {
        weight += 0.5;
    }

    // Boost for special chars
    if (/[^a-z0-9\s]/.test(normalizedAnswer)) {
        weight += 0.5;
    }

    // Minimum weight safegurad
    if (weight === 0) {
        weight = 0.5;
    }

    // Clip weight between 0.5 and 3.0
    // Original logic: weight / 5
    // e.g. length 5 -> 1.0
    // length 10 -> 2.0
    // length 15 -> 3.0 (max)
    const clipped = Math.min(3.0, Math.max(0.5, weight / 5));

    // Return rounded to 1 decimal place
    return Math.round(clipped * 10) / 10;
}

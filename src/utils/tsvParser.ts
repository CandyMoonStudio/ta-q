import fs from 'node:fs';
import { parse } from 'csv-parse/sync';

export interface QuestionRecord {
    id: string;
    text: string;
    answer: string;
    aliases: string;
    romaji: string;
    type: string;
    tags: string;
    difficulty: string; // New column: 1-5 (parsed as string initially)
    weight: string;
    status: string;
    source: string;
    answer_display: string;
    reading: string;
    explanation: string;
    [key: string]: string; // Allow flexible columns
}

/**
 * Reads a TSV file and returns parsed records.
 * Uses 'csv-parse' for robust parsing.
 */
export function readTsv(path: string): QuestionRecord[] {
    if (!fs.existsSync(path)) {
        throw new Error(`File not found: ${path}`);
    }

    const content = fs.readFileSync(path, 'utf8');

    // Basic empty check
    if (!content.trim()) {
        return [];
    }

    try {
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            delimiter: '\t',
            relax_column_count: true, // Allow varying column counts if necessary, though strict is better usually
            trim: true,
            quote: '"', // Standard quote handling
        });

        return records as QuestionRecord[];
    } catch (err) {
        console.error(`Failed to parse TSV at ${path}:`, err);
        throw err;
    }
}

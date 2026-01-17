import { describe, it, expect, afterEach } from 'vitest';
import { readTsv } from './tsvParser.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = os.tmpdir();
const tmpFile = path.join(tmpDir, `test_tsv_${Date.now()}.tsv`);

describe('readTsv', () => {
    afterEach(() => {
        if (fs.existsSync(tmpFile)) {
            fs.unlinkSync(tmpFile);
        }
    });

    it('should parse valid TSV content', () => {
        const content = `id\ttext\tanswer\n1\tQ1\tA1\n2\tQ2\tA2`;
        fs.writeFileSync(tmpFile, content, 'utf8');

        const result = readTsv(tmpFile);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(expect.objectContaining({ id: '1', text: 'Q1', answer: 'A1' }));
        expect(result[1]).toEqual(expect.objectContaining({ id: '2', text: 'Q2', answer: 'A2' }));
    });

    it('should handle empty file', () => {
        fs.writeFileSync(tmpFile, '', 'utf8');
        const result = readTsv(tmpFile);
        expect(result).toEqual([]);
    });

    it('should throw error if file not found', () => {
        expect(() => readTsv('/non/existent/file.tsv')).toThrow();
    });
});

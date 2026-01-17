import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTsv } from './utils/tsvParser.js';
import { validateQuestion } from './services/validator.js';
import { computeWeight } from './services/weightCalculator.js';
import type { Question } from './services/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const inputPath = path.join(rootDir, 'questions_edit.tsv');
const outDir = path.join(rootDir, 'out');

interface OutputQuestion {
    id: number | string;
    type?: string;
    question: string;
    romaji_typing?: string;
    answer_variants: string[];
    answer_display: string;
    answer: string;
    reading?: string;
    explanation?: string;

    // Debug/Internal
    _index?: number;
    status?: string;
    tags?: string;
    source?: string;
    weight: number;
    errors?: string[];
}

function stableSort(items: OutputQuestion[]): OutputQuestion[] {
    return items.sort((a, b) => {
        const idA = String(a.id);
        const idB = String(b.id);
        const idCompare = idA.localeCompare(idB, "en", { numeric: true });
        if (idCompare !== 0) {
            return idCompare;
        }
        return (a._index || 0) - (b._index || 0);
    });
}

function formatOutput(item: OutputQuestion): Partial<OutputQuestion> {
    const {
        _index, status, weight,
        ...rest
    } = item;

    // Remove undefined values
    const clean: any = { ...rest };
    if (!clean.explanation) delete clean.explanation;

    // Explicitly delete undefined keys if any remaining
    Object.keys(clean).forEach(key => {
        if (clean[key] === undefined) delete clean[key];
    });

    // We do want internal fields like weight? 
    // Original script: kept weight, status, source, tags in 'item' but extracted them out in destructuring...
    // Wait, original: `_index, status, tags, source, weight, ...rest` were REMOVED from output.
    // BUT line 76: `weight: question.weight` was added to `output` object.
    // THEN line 105: `weight` was destructured out.
    // SO `weight` was NOT in the final JSON?
    // Let's check original output or code again.
    // Original: 
    // const { _index, status, tags, source, weight, ...rest } = item;
    // return rest;
    // So YES, weight is NOT in production JSON.
    // Wait, typeanswer game might need weight if it uses it for random selection?
    // If the original code removed it, I should remove it too to be safe.

    return clean;
}

function build() {
    console.log('Building questions...');
    if (!fs.existsSync(inputPath)) {
        console.error('Input file not found:', inputPath);
        process.exit(1);
    }

    const rows = readTsv(inputPath);
    const prod: OutputQuestion[] = [];
    const debug: OutputQuestion[] = [];
    const ng: OutputQuestion[] = [];
    const errorCounts = new Map<string, number>();

    rows.forEach((row, index) => {
        const result = validateQuestion(row, index);
        const q = result.question;
        const errors = [...result.errors];

        const weight = computeWeight(q);

        // Prepare aliases array
        const aliases = q.aliases
            ? q.aliases.split('|').map(s => s.trim()).filter(s => s.length > 0)
            : [];

        const answerVariants = [q.answer, ...aliases];

        // Output Object Construction
        const output: OutputQuestion = {
            id: /^\d+$/.test(q.id) ? Number(q.id) : q.id,
            type: q.type || undefined,
            question: q.text,
            romaji_typing: q.romaji || undefined,
            answer_variants: answerVariants,

            // answer_display for UI
            answer_display: q.answer_display || q.answer,
            // answer field for JSON (compatibility)
            answer: q.answer_display || q.answer,

            reading: q.reading || undefined,
            explanation: q.explanation || undefined,

            // Internal
            _index: q._index,
            status: q.status,
            tags: q.tags,
            source: q.source,
            weight: weight
        };

        if (errors.length > 0) {
            output.errors = errors;
            ng.push(output);
            errors.forEach(e => {
                errorCounts.set(e, (errorCounts.get(e) || 0) + 1);
            });
        } else if (q.status === 'prod') {
            prod.push(output);
        } else if (q.status === 'debug') {
            debug.push(output);
        } else {
            // inbox or other status with no errors goes to ng (as 'not_ready')
            output.errors = ['status_not_prod_or_debug'];
            ng.push(output);
            errorCounts.set('status_not_ready', (errorCounts.get('status_not_ready') || 0) + 1);
        }
    });

    stableSort(prod);
    stableSort(debug);
    stableSort(ng);

    const prodOutput = prod.map(formatOutput);
    const debugOutput = debug.map(formatOutput);
    const ngOutput = ng.map(formatOutput);

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'questions_prod.json'), JSON.stringify(prodOutput, null, 2));
    fs.writeFileSync(path.join(outDir, 'questions_debug.json'), JSON.stringify(debugOutput, null, 2));
    fs.writeFileSync(path.join(outDir, 'questions_ng.json'), JSON.stringify(ngOutput, null, 2));

    // Report
    const reportLines = [
        `total\t${rows.length}`,
        `prod\t${prod.length}`,
        `debug\t${debug.length}`,
        `ng\t${ng.length}`,
        '',
        'errors'
    ];

    [...errorCounts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([code, count]) => {
            reportLines.push(`${code}\t${count}`);
        });

    fs.writeFileSync(path.join(outDir, 'report.txt'), reportLines.join('\n'));
    console.log(`Build complete. Prod: ${prod.length}, NG: ${ng.length}`);
}

build();

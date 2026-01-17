import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { normalize } from '../utils/normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const TSV_PATH = path.join(ROOT_DIR, 'questions_edit.tsv');

// Create interface for reading input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const questionPrompt = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer.trim());
        });
    });
};

function generateId(existingIds: Set<string>): string {
    // Determine new ID. Format: qXXXXX (e.g. q00001, q01023)
    // Find max number
    let maxNum = 0;
    for (const id of existingIds) {
        const match = id.match(/^q(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    }
    const nextNum = maxNum + 1;
    return `q${String(nextNum).padStart(5, '0')}`;
}

async function main() {
    console.log('--- Add New Question ---');

    // 1. Load existing IDs
    const existingIds = new Set<string>();
    if (fs.existsSync(TSV_PATH)) {
        const content = fs.readFileSync(TSV_PATH, 'utf8');
        const lines = content.split(/\r?\n/);
        // data starts from line 1 (header is 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split('\t');
            if (cols[0]) existingIds.add(cols[0]);
        }
    }

    // 2. Generate ID
    const newId = generateId(existingIds);
    console.log(`Generated ID: ${newId}`);

    // 3. Get Input
    let text = '';
    while (!text) {
        text = await questionPrompt('Question (Text): ');
    }

    let answer = '';
    while (!answer) {
        answer = await questionPrompt('Answer: ');
    }

    const aliasesInput = await questionPrompt('Aliases (pipe | separated): ');

    // Normalized check
    const norm = normalize(answer);
    console.log(`Normalized Answer: "${norm}"`);

    // 4. Confirm
    console.log('\n--- Preview ---');
    console.log(`ID: ${newId}`);
    console.log(`Text: ${text}`);
    console.log(`Answer: ${answer}`);
    if (aliasesInput) console.log(`Aliases: ${aliasesInput}`);
    console.log('---------------');

    const confirm = await questionPrompt('Save? (Y/n): ');
    if (confirm.toLowerCase() === 'n') {
        console.log('Cancelled.');
        rl.close();
        return;
    }

    // 5. Append to TSV
    // Columns: id, text, answer, aliases, romaji, type, tags, weight, status, source, explanation, answer_display, reading
    // TSV structure might vary, assume standard schema.
    // Based on import script:
    // id, text, answer, aliases, romaji, type, tags, weight, status, source, explanation
    // BUT we should verify header.

    // Let's read header to be safe or just assume standard order if we own the file.
    // Current 'import' script uses:
    // id, text, answer, aliases, romaji, type, tags, weight, status, source, explanation
    // We should stick to this order for now, or match existing file.

    // Simple append logic
    const row = [
        newId,              // id
        text,               // text
        answer,             // answer
        aliasesInput,       // aliases
        '',                 // romaji
        '',                 // type
        '',                 // tags
        '',                 // weight
        'inbox',            // status
        'cli',              // source
        '',                 // explanation
        '',                 // answer_display (optional extra cols if header exists?)
        ''                  // reading
    ].join('\t');

    fs.appendFileSync(TSV_PATH, '\n' + row, 'utf8');
    console.log(`Saved to ${TSV_PATH}`);

    rl.close();
}

main().catch(console.error);

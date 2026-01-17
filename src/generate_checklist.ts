import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml } from './utils/htmlEscape.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input: Build output from ta-question-gen
const DATA_FILE = path.join(__dirname, '../out/questions_prod.json');
// Template
const TEMPLATE_FILE = path.join(__dirname, 'templates/checklist.html');
// Output: GitHub Pages root
const OUTPUT_FILE = path.join(__dirname, '../docs/index.html');

/**
 * Highlights ambiguous romaji patterns using spans.
 */
function highlightAmbiguousRomaji(text: string): string {
    if (!text) return '';

    const patterns = [
        /(si|shi)/g, /(tu|tsu)/g, /(ti|chi)/g, /(hu|fu)/g, /(zi|ji)/g,
        /(sya|sha)/g, /(syu|shu)/g, /(syo|sho)/g,
        /(tya|cha)/g, /(tyu|chu)/g, /(tyo|cho)/g,
        /(ja|jya)/g, /(ju|jyu)/g, /(jo|jyo)/g,
        /(n)/g
    ];

    let highlighted = text;
    // Simple bulk replace approach
    const regex = new RegExp(`(${patterns.map((p) => p.source.replace(/[()]/g, '')).join('|')})`, 'g');
    highlighted = highlighted.replace(regex, '<span class="highlight-variant">$1</span>');

    return highlighted;
}

function generateChecklist() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.error('Error: Data file not found:', DATA_FILE);
            process.exit(1);
        }
        if (!fs.existsSync(TEMPLATE_FILE)) {
            console.error('Error: Template file not found:', TEMPLATE_FILE);
            process.exit(1);
        }

        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const questions: any[] = JSON.parse(rawData);
        const templateHtml = fs.readFileSync(TEMPLATE_FILE, 'utf8');

        let tableRows = '';

        for (const q of questions) {
            const romaji = q.romaji_typing || '';
            const highlightedRomaji = highlightAmbiguousRomaji(romaji);

            const hasVariants = q.answer_variants && q.answer_variants.length > 1;
            const rowClass = hasVariants ? 'has-variants' : '';
            const variantsText = q.answer_variants ? q.answer_variants.join(', ') : '-';
            const highlightedVariants = highlightAmbiguousRomaji(variantsText);

            // Safer display with full HTML escaping
            const displayQuestion = escapeHtml(q.question);
            const displayAnswer = escapeHtml(q.answer_display || q.answer);
            // Ensure ID is safe for attribute/JS string usage (validator checks regex, but escaping is safer practice)
            const safeId = escapeHtml(String(q.id));

            tableRows += `
                <tr id="row-${safeId}" class="${rowClass}" data-id="${safeId}">
                    <td class="action-cell">
                        <div class="action-buttons">
                            <button class="btn btn-ng" onclick="toggleStatus('${safeId}', 'NG')" title="Mark as NG">NG</button>
                            <button class="btn btn-note" onclick="activateNoteInput('${safeId}')" title="Edit Note">Note</button>
                        </div>
                    </td>
                    <td class="id-cell">
                        <span class="id-badge">${safeId}</span>
                    </td>
                    <td style="min-width: 250px;">
                        <div class="question-text">${displayQuestion}</div>
                        <div class="answer-text">${displayAnswer}</div>
                    </td>
                    <td class="romaji-cell">
                        <span class="romaji-main">${highlightedRomaji}</span>
                        ${variantsText !== '-' ? `<span class="romaji-variants">Variants: ${highlightedVariants}</span>` : ''}
                    </td>
                    <td class="status-cell" id="status-${q.id}"></td>
                </tr>`;
        }

        // Inject data into template
        let outputHtml = templateHtml
            .replace('{{TABLE_ROWS}}', tableRows)
            .replace('{{TOTAL_COUNT}}', String(questions.length))
            .replace('{{GENERATED_DATE}}', new Date().toLocaleString('ja-JP'));

        const docsDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, outputHtml, 'utf8');
        console.log(`Checklist generated: ${OUTPUT_FILE} (${questions.length} questions)`);
    } catch (err) {
        console.error('Error generating checklist:', err);
        process.exit(1);
    }
}

generateChecklist();

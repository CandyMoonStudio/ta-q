import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml } from './utils/htmlEscape.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input: Build output from ta-question-gen
const PROD_FILE = path.join(__dirname, '../out/questions_prod.json');
const DEBUG_FILE = path.join(__dirname, '../out/questions_debug.json');
const NG_FILE = path.join(__dirname, '../out/questions_ng.json');
const TEMPLATE_FILE = path.join(__dirname, 'templates/checklist.html');
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

function loadJson(p: string) {
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function generateChecklist() {
    try {
        if (!fs.existsSync(TEMPLATE_FILE)) {
            console.error('Error: Template file not found:', TEMPLATE_FILE);
            process.exit(1);
        }

        const prodQuestions = loadJson(PROD_FILE);
        const debugQuestions = loadJson(DEBUG_FILE);
        const ngQuestions = loadJson(NG_FILE);

        const allQuestions = [
            ...prodQuestions.map((q: any) => ({ ...q, _list: 'prod' })),
            ...debugQuestions.map((q: any) => ({ ...q, _list: 'debug' })),
            ...ngQuestions.map((q: any) => ({ ...q, _list: 'ng' }))
        ];

        const templateHtml = fs.readFileSync(TEMPLATE_FILE, 'utf8');

        let tableRows = '';

        for (const q of allQuestions) {
            const romaji = q.romaji_typing || '';
            const highlightedRomaji = highlightAmbiguousRomaji(romaji);

            const hasVariants = q.answer_variants && q.answer_variants.length > 1;
            const variantsText = q.answer_variants ? q.answer_variants.join(', ') : '-';
            const highlightedVariants = highlightAmbiguousRomaji(variantsText);

            const displayQuestion = escapeHtml(q.question);
            const displayAnswer = escapeHtml(q.answer_display || q.answer);
            const safeId = escapeHtml(String(q.id));

            // Status Badge for the list
            let listBadge = '';
            if (q._list === 'debug') listBadge = '<span class="status-badge debug" style="margin-left:8px; background:#8b5cf6; color:white; font-size:0.7em;">DEBUG</span>';
            if (q._list === 'ng') listBadge = '<span class="status-badge ng" style="margin-left:8px; font-size:0.7em;">NG</span>';

            const rowClass = q._list === 'ng' ? 'row-ng-initial' : (q._list === 'debug' ? 'row-debug-initial' : '');

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
                        <div class="question-text">${displayQuestion}${listBadge}</div>
                        <div class="answer-text">${displayAnswer}</div>
                        ${q.errors ? `<div style="font-size:0.75rem; color:#ef4444; margin-top:4px;">${q.errors.join(', ')}</div>` : ''}
                    </td>
                    <td class="romaji-cell">
                        <span class="romaji-main">${highlightedRomaji}</span>
                        ${variantsText !== '-' ? `<span class="romaji-variants">Variants: ${highlightedVariants}</span>` : ''}
                    </td>
                    <td class="status-cell" id="status-${safeId}"></td>
                </tr>`;
        }

        const statsHtml = `
            <span style="color:#10b981">Prod: ${prodQuestions.length}</span> | 
            <span style="color:#8b5cf6">Debug: ${debugQuestions.length}</span> | 
            <span style="color:#ef4444">NG: ${ngQuestions.length}</span>
        `;

        let outputHtml = templateHtml
            .replace('{{TABLE_ROWS}}', tableRows)
            .replace('{{TOTAL_COUNT}} items', statsHtml)
            .replace('{{GENERATED_DATE}}', new Date().toLocaleString('ja-JP'));

        const docsDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, outputHtml, 'utf8');
        console.log(`Checklist generated: ${OUTPUT_FILE} (Prod:${prodQuestions.length}, Debug:${debugQuestions.length}, NG:${ngQuestions.length})`);
    } catch (err) {
        console.error('Error generating checklist:', err);
        process.exit(1);
    }
}

generateChecklist();

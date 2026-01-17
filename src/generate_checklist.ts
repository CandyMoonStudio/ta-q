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
            const escapedRomaji = escapeHtml(romaji);
            const highlightedRomaji = highlightAmbiguousRomaji(escapedRomaji);

            const variantsText = q.answer_variants ? q.answer_variants.join(', ') : '-';
            const escapedVariants = escapeHtml(variantsText);
            const highlightedVariants = highlightAmbiguousRomaji(escapedVariants);

            const displayQuestion = escapeHtml(q.question);
            const displayAnswer = escapeHtml(q.answer_display || q.answer);
            const safeId = escapeHtml(String(q.id));

            const typeText = q.type || '';
            const tagsText = q.tags || '';
            const searchText = (q.id + ' ' + q.question + ' ' + q.answer + ' ' + (q.answer_display || '') + ' ' + (q.romaji_typing || '')).toLowerCase();

            // Status Badge for the list
            let listBadge = '';

            // Mapping initial list to display status
            let initialStatus = q._list || 'unset';
            if (initialStatus === 'prod') initialStatus = 'ok';

            const statusClass = initialStatus !== 'unset' ? `row-${initialStatus}` : '';
            const badgeHtml = initialStatus !== 'unset' ?
                `<span class="status-badge ${initialStatus}">${initialStatus.toUpperCase()}</span>` : '';

            tableRows += `
                <tr id="row-${safeId}" class="${statusClass}" 
                    data-id="${safeId}" 
                    data-search="${escapeHtml(searchText)}" 
                    data-type="${escapeHtml(typeText)}" 
                    data-tags="${escapeHtml(tagsText)}"
                    data-status-initial="${initialStatus}">
                    <td class="action-cell">
                        <div class="action-buttons">
                            <button class="btn-icon btn-ok" data-action="set-status" data-status="ok" title="採用 (OK)">✓</button>
                            <button class="btn-icon btn-ng" data-action="set-status" data-status="ng" title="却下 (NG)">×</button>
                            <button class="btn-icon btn-debug" data-action="set-status" data-status="debug" title="要修正 (Debug)">?</button>
                            <button class="btn-icon btn-hold" data-action="set-status" data-status="hold" title="保留 (Hold)">!</button>
                            <button class="btn-icon btn-note" data-action="activate-note" title="メモを追加">📝</button>
                        </div>
                    </td>
                    <td class="status-cell" id="badge-${safeId}" style="min-width: 100px;">${badgeHtml}</td>
                    <td class="id-cell">
                        <span class="id-badge">${safeId}</span>
                    </td>
                    <td class="genre-cell" style="font-size:0.85em; color:var(--text-sub);">
                        ${typeText ? `<span class="tag-badge type">${escapeHtml(typeText)}</span>` : ''}
                        ${tagsText ? `<span class="tag-badge tag">${escapeHtml(tagsText)}</span>` : ''}
                    </td>
                    <td style="min-width: 250px;">
                        <div class="question-text"><span style="opacity:0.5; margin-right:4px;">Q:</span>${displayQuestion}</div>
                        <div class="answer-text"><span style="opacity:0.5; margin-right:4px;">A:</span>${displayAnswer}</div>
                        ${q.errors ? `<div style="font-size:0.75rem; color:#ef4444; margin-top:4px;">${escapeHtml(q.errors.join(', '))}</div>` : ''}
                    </td>
                    <td class="romaji-cell">
                        <span class="romaji-main">${highlightedRomaji}</span>
                        ${variantsText !== '-' ? `<span class="romaji-variants">Variants: ${highlightedVariants}</span>` : ''}
                    </td>
                    <td class="note-cell" id="note-${safeId}"></td>
                </tr>`;
        }

        const statsHtml = `
            <div class="stats-item prod">採用: <span id="count-prod">${prodQuestions.length}</span></div>
            <div class="stats-item debug">要修正: <span id="count-debug">${debugQuestions.length}</span></div>
            <div class="stats-item ng">却下: <span id="count-ng">${ngQuestions.length}</span></div>
            <div class="stats-item hold">保留: <span id="count-hold">0</span></div>
            <div class="stats-item info">${allQuestions.length} items</div>
            <div class="stats-item info">${new Date().toLocaleString('ja-JP')}</div>
        `;

        // Load external resources
        const cssPath = path.join(__dirname, 'templates', 'checklist.css');
        const jsPath = path.join(__dirname, 'templates', 'checklist.js');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        const jsContent = fs.readFileSync(jsPath, 'utf-8');

        let outputHtml = templateHtml
            .replace('{{TABLE_ROWS}}', tableRows)
            .replace('{{TOTAL_COUNT}} items • Generated: {{GENERATED_DATE}}', statsHtml)
            .replace(/{{\s*SERVER_DATA\s*}}/, JSON.stringify(allQuestions).replace(/\//g, '\\/'))
            .replace(/\{\s*\{\s*STYLES\s*\}\s*\}/g, cssContent)
            .replace(/\{\s*\{\s*SCRIPTS\s*\}\s*\}/g, jsContent);

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

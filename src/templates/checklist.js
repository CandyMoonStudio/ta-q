// checklist.js

// --- Feature Flag ---
const REVIEW_ENABLED = true;
const LS_KEY = 'taq_review_v2';

// State
let reviewData = {};
let drafts = []; // Changed from const to let because it was redeclared in original scope? No, drafted as const list usually. But wait, `renderDrafts` uses it. Let's keep it const if it's mutable array.
// Actually original was `const drafts = []`.
// However, I need to make sure global scope works.
// We will assign window.drafts or just keep it in this module scope if loaded as module?
// Since we are inlining, it will be in global scope if simply scripted.

// We'll wrap in IIFE or event listener to avoid pollution, but functions need to be global for HTML attributes (onclick)
// UNLESS we use addEventListener for everything.
// Current HTML uses `onclick="toggleDrawer()"`. So functions must be global.

// We will expose functions to window.

// --- Init ---
window.addEventListener('DOMContentLoaded', () => {
    if (!REVIEW_ENABLED) {
        // Disable Review Features
        document.querySelectorAll('.action-cell, .fab-add, #drawer').forEach(el => el.style.display = 'none');
        return;
    }

    // Load from LS
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            reviewData = JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load review data', e);
        reviewData = {};
    }

    // Apply to UI
    Object.values(reviewData).forEach(item => {
        const row = document.getElementById('row-' + item.id);
        if (row) {
            updateRowVisuals(item.id);
            renderStatusCell(item.id);
        }
    });

    updateReport();
    updateStats();

    // Init Filters & Table Features
    initFilters();
    initTableFeatures();
    initDrawerResize();
});

// --- LocalStorage ---
function saveToLS() {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(reviewData));
    } catch (e) {
        console.error('Save failed', e);
    }
    updateReport();
}

// --- Stats Update ---
function updateStats() {
    // Initial counts from server data
    let counts = {
        prod: 0, debug: 0, ng: 0, hold: 0
    };

    // Base counts from SERVER_DATA
    if (typeof SERVER_DATA !== 'undefined') {
        SERVER_DATA.forEach(q => {
            if (q._list === 'prod') counts.prod++;
            else if (q._list === 'debug') counts.debug++;
            else if (q._list === 'ng') counts.ng++;
        });
    }

    // Calculate effective counts
    let currentCounts = { ok: 0, debug: 0, ng: 0, hold: 0, unset: 0 };

    if (typeof SERVER_DATA !== 'undefined') {
        SERVER_DATA.forEach(q => {
            const id = q.id;
            let initialStatus = q._list;
            if (initialStatus === 'prod') initialStatus = 'unset';

            const review = reviewData[id];
            let effective = review?.status || initialStatus;

            if (effective === 'prod') effective = 'ok'; // Normalize
            if (effective === 'unset' || !effective) effective = 'ok'; // Treat unset as OK (Prod) for counting? Or separate?
            // In original summary logic: "Prod: 34" usually means unset/ok.

            // Let's strictly follow filter logic mapping if possible, but for stats:
            // "Prod" (adoption) count usually includes 'ok' and 'unset' (default).
            if (effective === 'limit') effective = 'ng'; // Just in case

            // Map
            let key = effective;
            if (key === 'prod') key = 'ok';
            if (key === 'unset') key = 'ok'; // Assuming unset = prod = ok

            if (currentCounts.hasOwnProperty(key)) {
                currentCounts[key]++;
            }
        });
    }

    // Update DOM
    const setSafe = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };
    // Prod(OK), Debug, NG, Hold
    setSafe('count-prod', currentCounts.ok);
    setSafe('count-debug', currentCounts.debug);
    setSafe('count-ng', currentCounts.ng);
    setSafe('count-hold', currentCounts.hold);
}

// --- Status Management ---
function setStatus(id, status) {
    if (!reviewData[id]) {
        reviewData[id] = { id: id, status: null, note: '', updatedAt: 0 };
    }

    const current = reviewData[id].status;

    if (current === status) {
        // Toggle OFF
        reviewData[id].status = null;
    } else {
        // Set New
        reviewData[id].status = status;
    }

    reviewData[id].updatedAt = Date.now();

    saveToLS();
    updateRowVisuals(id);
    renderStatusCell(id);
    updateStats();

    // NO applyFilters() call here (Reverted behavior)
}

function activateNoteInput(id) {
    if (!reviewData[id]) {
        reviewData[id] = { id: id, status: null, note: '', updatedAt: 0 };
    }

    const noteCell = document.getElementById('note-' + id);
    const currentNote = reviewData[id].note || '';

    // Prevent re-render if already editing
    if (noteCell.querySelector('input')) return;

    noteCell.innerHTML = `
    <div class="inline-input-container">
        <input type="text" id="input-${id}" class="inline-input" 
               value="${currentNote.replace(/"/g, '&quot;')}" 
               placeholder="メモを入力..." 
               onkeydown="handleInputKey(event, '${id}')"
               onblur="saveNote('${id}')">
    </div>
`;

    setTimeout(() => {
        const el = document.getElementById('input-' + id);
        if (el) el.focus();
    }, 50);
}

function handleInputKey(event, id) {
    if (event.key === 'Enter') {
        event.target.blur();
    }
}

function saveNote(id) {
    const input = document.getElementById('input-' + id);
    if (!input) return;

    const text = input.value.trim();
    if (reviewData[id].note !== text) {
        reviewData[id].note = text;
        reviewData[id].updatedAt = Date.now();
        saveToLS();
    }

    renderStatusCell(id);
}

function updateRowVisuals(id) {
    const row = document.getElementById('row-' + id);
    if (!row) return;

    const data = reviewData[id];
    const status = data ? data.status : null;

    // Reset Classes
    row.classList.remove('row-ok', 'row-ng', 'row-debug', 'row-hold', 'row-note');

    // Reset Button Active States
    row.querySelectorAll('.btn-icon').forEach(btn => btn.classList.remove('active'));

    if (status) {
        row.classList.add('row-' + status);
        const btn = row.querySelector('.btn-' + status);
        if (btn) btn.classList.add('active');
    }

    // Note active state
    if (data && data.note) {
        const btnNote = row.querySelector('.btn-note');
        if (btnNote) btnNote.classList.add('active');
        if (!status) row.classList.add('row-note');
    }
}

function renderStatusCell(id) {
    const badgeCell = document.getElementById(`badge-${id}`);
    const noteCell = document.getElementById(`note-${id}`);

    if (!badgeCell || !noteCell) return;
    if (noteCell.querySelector('input')) return; // Editing note

    const data = reviewData[id];

    // 1. Badge (Status Column)
    let badgeHtml = '';
    if (data && data.status) {
        badgeHtml = `<span class="status-badge ${data.status}">${data.status.toUpperCase()}</span>`;
    }
    badgeCell.innerHTML = badgeHtml;

    // 2. Note (Note Column)
    let noteHtml = '';
    if (data && data.note) {
        noteHtml = `<span class="note-text">${escapeHtml(data.note)}</span>`;
    }
    noteCell.innerHTML = noteHtml;
}

// --- Drawer & Tabs ---
function toggleDrawer() {
    const drawer = document.getElementById('drawer');
    const body = document.body;
    // We toggle a class on body or style on drawer
    // CSS uses body.drawer-open
    if (body.classList.contains('drawer-open')) {
        body.classList.remove('drawer-open');
    } else {
        body.classList.add('drawer-open');
    }
}

function switchTab(tab) {
    document.querySelectorAll('.drawer-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('content-' + tab).classList.add('active');
}

// --- Report / Export ---
function updateReport() {
    const reportArea = document.getElementById('report-area');
    if (!reportArea) return; // May be hidden
    reportArea.value = JSON.stringify(reviewData, null, 2);
}

function copyReport() {
    const reportArea = document.getElementById('report-area');
    reportArea.select();
    document.execCommand('copy');
    alert('JSON copied to clipboard');
}

function copyMarkdownExport() {
    // Generate Markdown for GitHub Issue
    const lines = [];
    lines.push('## Review Update');

    ['ng', 'debug', 'hold'].forEach(status => {
        const items = Object.values(reviewData).filter(r => r.status === status);
        if (items.length > 0) {
            lines.push(`\n### ${status.toUpperCase()}`);
            items.forEach(item => {
                const q = SERVER_DATA.find(d => d.id === item.id);
                const qText = q ? q.question : '???';
                lines.push(`- **${item.id}**: ${item.note || '(No note)'}`);
                lines.push(`  - Q: ${qText}`);
            });
        }
    });

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        alert('Markdown report copied!');
    });
}

// --- Add New Draft ---
function openAddTab() {
    if (!document.body.classList.contains('drawer-open')) {
        toggleDrawer();
    }
    switchTab('add');
}

function addDraft() {
    const idInput = document.getElementById('new-id');
    const textInput = document.getElementById('new-text');
    const answerInput = document.getElementById('new-answer');

    const text = textInput.value.trim();
    const answer = answerInput.value.trim();
    let id = idInput.value.trim();

    if (!text || !answer) {
        alert('Question and Answer are required.');
        return;
    }

    if (!id) {
        id = 'draft_' + Date.now();
    }

    drafts.push({ id, text, answer });
    renderDrafts();

    // Clear inputs
    textInput.value = '';
    answerInput.value = '';
    idInput.value = '';
    textInput.focus();
}

function renderDrafts() {
    const list = document.getElementById('draft-list');
    list.innerHTML = '';
    drafts.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'draft-item';
        el.innerHTML = `
        <div>
            <div style="font-weight:700; color:#a5f3fc">${escapeHtml(item.text)}</div>
            <div style="font-size:0.8em">${escapeHtml(item.answer)}</div>
        </div>
        <span class="draft-remove" onclick="removeDraft(${idx})">×</span>
    `;
        list.appendChild(el);
    });
}

function removeDraft(index) {
    drafts.splice(index, 1);
    renderDrafts();
}

function copyTsv() {
    if (drafts.length === 0) {
        alert('No drafts to copy.');
        return;
    }
    const tsvRows = drafts.map(d => {
        const safeText = d.text.replace(/\t/g, ' ');
        const safeAnswer = d.answer.replace(/\t/g, ' ');
        return [
            d.id, safeText, safeAnswer, '', '', '', '', '', 'inbox', 'web_draft', ''
        ].join('\t');
    });

    navigator.clipboard.writeText(tsvRows.join('\n')).then(() => {
        const btn = document.querySelector('#content-add .copy-btn');
        const original = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = original, 2000);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- Filters & Search ---
function initFilters() {
    // Populate Genre Filter
    const genres = new Set();
    if (typeof SERVER_DATA !== 'undefined') {
        SERVER_DATA.forEach(q => {
            if (q.type) genres.add(q.type);
            if (q.tags) {
                q.tags.split(',').forEach(t => genres.add(t.trim()));
            }
        });
    }
    const genreSelect = document.getElementById('genre-filter');
    // convert to array, sort, insert
    const sortedGenres = Array.from(genres).sort();
    sortedGenres.forEach(g => {
        if (!g) return;
        const opt = document.createElement('option');
        opt.value = g;
        opt.innerText = g;
        genreSelect.appendChild(opt);
    });

    // Event Listeners
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('genre-filter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const searchTerms = searchInput.value.toLowerCase().split(/\s+/).filter(t => t);

    const statusFilter = document.getElementById('status-filter').value;
    const genreFilter = document.getElementById('genre-filter').value;

    const rows = document.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const id = row.getAttribute('data-id');
        // skip if not a data row (e.g. empty message)
        if (!id) return;

        const searchData = (row.getAttribute('data-search') || '').toLowerCase();
        const typeData = row.getAttribute('data-type') || '';
        const tagsData = row.getAttribute('data-tags') || '';
        let initialStatus = row.getAttribute('data-status-initial');

        // Normalization
        if (initialStatus === 'prod') initialStatus = 'unset';

        // Resolve Current Status
        const currentReview = reviewData[id];
        let effectiveStatus = currentReview?.status || initialStatus || 'unset';

        // 1. Search
        let matchSearch = true;
        if (searchTerms.length > 0) {
            matchSearch = searchTerms.every(term => searchData.includes(term));
        }

        // 2. Status
        let matchStatus = true;
        if (statusFilter !== 'all') {
            matchStatus = (effectiveStatus === statusFilter);
        }

        // 3. Genre
        let matchGenre = true;
        if (genreFilter !== 'all') {
            const typeMatch = typeData === genreFilter;
            const tagMatch = tagsData.split(',').map(t => t.trim()).includes(genreFilter);
            matchGenre = typeMatch || tagMatch;
        }

        if (matchSearch && matchStatus && matchGenre) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// --- Sort & Resize ---
function initTableFeatures() {
    const table = document.querySelector('table');
    const headers = table.querySelectorAll('th');

    headers.forEach((th, index) => {
        // 1. Sort
        // Skip Action column (index 0)
        if (index > 0) {
            th.addEventListener('click', () => sortTable(index));
        }

        // 2. Resize
        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        th.appendChild(resizer);
        createResizableColumn(th, resizer);
    });
}

let sortDirection = 1; // 1: asc, -1: desc
let lastSortIndex = -1;

function sortTable(columnIndex) {
    const table = document.querySelector('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    if (lastSortIndex === columnIndex) {
        sortDirection *= -1;
    } else {
        sortDirection = 1;
        lastSortIndex = columnIndex;
    }

    // Simple type check: try number, then string
    const getValue = (tr, idx) => {
        const td = tr.children[idx];
        return td ? (td.innerText || td.textContent) : '';
    };

    rows.sort((a, b) => {
        const valA = getValue(a, columnIndex).trim();
        const valB = getValue(b, columnIndex).trim();

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);

        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
            return (numA - numB) * sortDirection;
        }
        return valA.localeCompare(valB) * sortDirection;
    });

    // Re-append to tbody
    rows.forEach(row => tbody.appendChild(row));

    // Re-apply filters? Not needed visually as display:none persists
}

function createResizableColumn(th, resizer) {
    let x = 0;
    let w = 0;

    const mouseDownHandler = function (e) {
        x = e.clientX;
        const styles = window.getComputedStyle(th);
        w = parseInt(styles.width, 10);

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        resizer.classList.add('resizing');
        e.preventDefault();
        e.stopPropagation();
    };

    const mouseMoveHandler = function (e) {
        const dx = e.clientX - x;
        th.style.width = `${w + dx}px`;
    };

    const mouseUpHandler = function () {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        resizer.classList.remove('resizing');
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
    resizer.addEventListener('click', (e) => e.stopPropagation());
}

// --- Drawer Resize ---
function initDrawerResize() {
    const drawer = document.getElementById('drawer');
    const resizer = drawer.querySelector('.drawer-resizer');
    const body = document.body;

    let w = 0;
    let x = 0;

    const mouseDownHandler = function (e) {
        x = e.clientX;
        const styles = window.getComputedStyle(drawer);
        w = parseInt(styles.width, 10);

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    };

    const mouseMoveHandler = function (e) {
        const dx = x - e.clientX; // Expanding to left
        const newWidth = w + dx;
        if (newWidth > 200 && newWidth < window.innerWidth * 0.9) {
            drawer.style.width = `${newWidth}px`;
            // Update CSS variable if possible, or just style
            document.documentElement.style.setProperty('--drawer-width', `${newWidth}px`);
        }
    };

    const mouseUpHandler = function () {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
}

// Export functions to window to be accessible from HTML onclick attributes
window.toggleDrawer = toggleDrawer;
window.switchTab = switchTab;
window.copyMarkdownExport = copyMarkdownExport;
window.copyReport = copyReport;
window.openAddTab = openAddTab;
window.addDraft = addDraft;
window.removeDraft = removeDraft;
window.copyTsv = copyTsv;
window.setStatus = setStatus;
window.activateNoteInput = activateNoteInput;
window.handleInputKey = handleInputKey;
window.saveNote = saveNote;

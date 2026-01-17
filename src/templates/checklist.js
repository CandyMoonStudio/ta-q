// checklist.js

// --- Feature Flag ---
const REVIEW_ENABLED = true;
const LS_KEY = 'taq_review_v2';

// State
let reviewData = {};
let drafts = [];

// --- Init ---
window.addEventListener('DOMContentLoaded', () => {
    if (!REVIEW_ENABLED) {
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

    // Init Logic
    initFilters();
    initTableFeatures();
    initDrawerResize();
    initEventListeners(); // Centralized Event Handling
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

// --- Event Delegation (Security & Cleanup) ---
function initEventListeners() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) {
            // Check for backdrop click to close drawer
            if (document.body.classList.contains('drawer-open') &&
                !e.target.closest('#drawer') &&
                !e.target.closest('#btn-open-add') &&
                !e.target.closest('.fab-add')) {
                toggleDrawer();
            }
            return;
        }

        const action = target.dataset.action;
        const row = target.closest('tr');
        const id = row ? row.dataset.id : null;

        switch (action) {
            case 'set-status':
                if (id) setStatus(id, target.dataset.status);
                break;
            case 'activate-note':
                if (id) activateNoteInput(id);
                break;
            case 'toggle-drawer': // If we had a toggle button
                toggleDrawer();
                break;
            case 'open-add':
                if (!document.body.classList.contains('drawer-open')) {
                    toggleDrawer();
                }
                switchTab('add');
                break;
            case 'download-json':
                downloadJson(target.dataset.target);
                break;
            case 'copy-markdown':
                copyMarkdownExport();
                break;
            case 'copy-json':
                copyReport();
                break;
            case 'add-draft':
                addDraft();
                break;
            case 'remove-draft':
                const idx = target.dataset.index;
                if (idx !== undefined) removeDraft(parseInt(idx, 10));
                break;
            case 'copy-tsv':
                copyTsv();
                break;
            default:
                // Handle tab switching
                if (target.classList.contains('drawer-tab-btn')) {
                    switchTab(target.dataset.tab);
                }
                break;
        }

        // Static IDs for specific buttons
        if (target.id === 'btn-close-drawer' || target.id === 'btn-open-add') {
            toggleDrawer();
        }
    });

    // Delegate input events?
    // Note inputs are created dynamically. We can attach listeners on creation OR delegate.
    // Delegation for 'keydown' and 'blur' (focusout)
    document.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('inline-input')) {
            handleInputKey(e, e.target);
        }
    });

    document.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('inline-input')) {
            // Delay slightly to allow click events to register (e.g. clicking another button)
            // But logic is simply "save on blur".
            const id = e.target.dataset.id;
            if (id) saveNote(id, e.target.value);
        }
    });
}

// --- Stats Update ---
function updateStats() {
    let counts = { prod: 0, debug: 0, ng: 0 };
    if (typeof SERVER_DATA !== 'undefined') {
        SERVER_DATA.forEach(q => {
            if (q._list === 'prod') counts.prod++;
            else if (q._list === 'debug') counts.debug++;
            else if (q._list === 'ng') counts.ng++;
        });
    }

    let currentCounts = { ok: 0, debug: 0, ng: 0, hold: 0 };

    if (typeof SERVER_DATA !== 'undefined') {
        SERVER_DATA.forEach(q => {
            const id = q.id;
            let initialStatus = q._list || 'unset';
            if (initialStatus === 'prod') initialStatus = 'ok';

            const review = reviewData[id];
            let effective = review?.status || initialStatus;

            if (effective === 'prod') effective = 'ok';
            if (effective === 'unset' || !effective) effective = 'ok';

            if (currentCounts.hasOwnProperty(effective)) {
                currentCounts[effective]++;
            }
        });
    }

    const setSafe = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
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
        reviewData[id].status = null;
    } else {
        reviewData[id].status = status;
    }
    reviewData[id].updatedAt = Date.now();

    saveToLS();
    updateRowVisuals(id);
    renderStatusCell(id); // Re-render badge
    renderNoteCell(id);   // Re-render note (placeholder might change on NG)
    updateStats();
}

function updateRowVisuals(id) {
    const row = document.getElementById('row-' + id);
    if (!row) return;

    const data = reviewData[id];
    const status = data ? data.status : null;

    row.classList.remove('row-ok', 'row-ng', 'row-debug', 'row-hold', 'row-note');
    row.querySelectorAll('.btn-icon').forEach(btn => btn.classList.remove('active'));

    if (status) {
        row.classList.add('row-' + status);
        const btn = row.querySelector(`[data-status="${status}"]`);
        if (btn) btn.classList.add('active');
    }

    if (data && data.note) {
        const btnNote = row.querySelector('[data-action="activate-note"]');
        if (btnNote) btnNote.classList.add('active');
        if (!status) row.classList.add('row-note');
    }
}

// --- Render Cells (XSS Safe) ---
function renderStatusCell(id) {
    const badgeCell = document.getElementById(`badge-${id}`);
    if (!badgeCell) return;

    badgeCell.innerHTML = ''; // Clear

    const data = reviewData[id];
    if (data && data.status) {
        const span = document.createElement('span');
        span.className = `status-badge ${data.status}`;
        span.textContent = data.status.toUpperCase();
        badgeCell.appendChild(span);
    }
}

// Renamed from activateNoteInput (logic split)
function renderNoteCell(id) {
    const noteCell = document.getElementById(`note-${id}`);
    if (!noteCell) return;
    if (noteCell.querySelector('input')) return; // Editing

    noteCell.innerHTML = '';

    const data = reviewData[id];
    if (data && data.note) {
        const span = document.createElement('span');
        span.className = 'note-text';
        span.textContent = data.note;
        noteCell.appendChild(span);
    }
}

// Activated by click
function activateNoteInput(id) {
    if (!reviewData[id]) {
        reviewData[id] = { id: id, status: null, note: '', updatedAt: 0 };
    }

    const noteCell = document.getElementById('note-' + id);
    if (!noteCell) return;
    if (noteCell.querySelector('input')) return;

    const currentNote = reviewData[id].note || '';
    const currentStatus = reviewData[id].status;

    noteCell.innerHTML = ''; // Clear text

    const container = document.createElement('div');
    container.className = 'inline-input-container';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `input-${id}`;
    input.className = 'inline-input';
    input.value = currentNote;
    input.dataset.id = id; // For blur handler

    // Context-aware placeholder and stying
    if (currentStatus === 'ng') {
        input.placeholder = "NG理由を入力...";
        input.classList.add('input-warn');
    } else {
        input.placeholder = "メモを入力...";
    }

    container.appendChild(input);
    noteCell.appendChild(container);

    setTimeout(() => {
        input.focus();
    }, 50);
}

function handleInputKey(event, input) {
    if (event.key === 'Enter') {
        input.blur();
    }
}

function saveNote(id, text) {
    const trimmed = text.trim();
    if (!reviewData[id]) reviewData[id] = {};

    if (reviewData[id].note !== trimmed) {
        reviewData[id].note = trimmed;
        reviewData[id].updatedAt = Date.now();
        saveToLS();
    }

    // Re-render as text
    updateRowVisuals(id); // To update icon state
    renderNoteCell(id);
}

// --- Drawer & Tabs ---
function toggleDrawer() {
    const body = document.body;
    if (body.classList.contains('drawer-open')) {
        body.classList.remove('drawer-open');
    } else {
        body.classList.add('drawer-open');
    }
}

function switchTab(tab) {
    document.querySelectorAll('.drawer-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.drawer-content').forEach(c => c.classList.remove('active')); // Fixed selector

    const btn = document.querySelector(`.drawer-tab-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');

    const content = document.getElementById('content-' + tab);
    if (content) content.classList.add('active');
}

// --- Downloads / Exports ---
function downloadJson(target) {
    // target: 'prod' | 'ng' | 'debug'
    if (typeof SERVER_DATA === 'undefined') {
        alert('No data source available');
        return;
    }

    // Merge logic
    const exportList = [];

    SERVER_DATA.forEach(q => {
        const id = q.id;
        // Normalize initial
        let initialStatus = q._list || 'unset';
        if (initialStatus === 'prod') initialStatus = 'ok';

        // Apply review
        const review = reviewData[id];
        let effective = review?.status || initialStatus;
        if (effective === 'prod') effective = 'ok';
        if (effective === 'unset') effective = 'ok';

        let shouldInclude = false;
        if (target === 'prod' && effective === 'ok') shouldInclude = true;
        if (target === 'ng' && effective === 'ng') shouldInclude = true;
        if (target === 'debug' && effective === 'debug') shouldInclude = true;

        if (shouldInclude) {
            // Clone q content
            const item = { ...q };
            // Update _list
            item._list = (target === 'prod') ? 'prod' : target;

            // Add note if exists (for NG/Debug mainly)
            if (review?.note) {
                item.note = review.note;
            } else {
                delete item.note; // Clean up
            }

            exportList.push(item);
        }
    });

    if (exportList.length === 0) {
        alert(`No items found for ${target.toUpperCase()}`);
        return;
    }

    const jsonStr = JSON.stringify(exportList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `kpm_questions_${target}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function updateReport() {
    const reportArea = document.getElementById('report-area');
    if (!reportArea) return;
    reportArea.value = JSON.stringify(reviewData, null, 2);
}

function copyReport() {
    const reportArea = document.getElementById('report-area');
    reportArea.select();
    document.execCommand('copy');
    alert('JSON copied to clipboard');
}

function copyMarkdownExport() {
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

// --- Drafts (Client Only) ---
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

    textInput.value = '';
    answerInput.value = '';
    idInput.value = '';
    textInput.focus();
}

function renderDrafts() {
    const list = document.getElementById('draft-list');
    list.innerHTML = ''; // Safe here as we control content
    drafts.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'draft-item';

        // Escape content
        const safeText = escapeHtml(item.text);
        const safeAnswer = escapeHtml(item.answer);

        el.innerHTML = `
        <div>
            <div style="font-weight:700; color:#a5f3fc">${safeText}</div>
            <div style="font-size:0.8em">${safeAnswer}</div>
        </div>
        <span class="draft-remove" data-action="remove-draft" data-index="${idx}">×</span>
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
        const btn = document.querySelector('[data-action="copy-tsv"]');
        if (btn) {
            const original = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => btn.textContent = original, 2000);
        }
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
    const sortedGenres = Array.from(genres).sort();
    sortedGenres.forEach(g => {
        if (!g) return;
        const opt = document.createElement('option');
        opt.value = g;
        opt.innerText = g;
        genreSelect.appendChild(opt);
    });

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
        if (!id) return;

        const searchData = (row.getAttribute('data-search') || '').toLowerCase();
        const typeData = row.getAttribute('data-type') || '';
        const tagsData = row.getAttribute('data-tags') || '';
        let initialStatus = row.getAttribute('data-status-initial');

        // Normalization
        if (initialStatus === 'prod') initialStatus = 'ok';

        // Resolve Current Status
        const currentReview = reviewData[id];
        let effectiveStatus = currentReview?.status || initialStatus || 'unset';
        if (effectiveStatus === 'unset') effectiveStatus = 'ok';

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

function initTableFeatures() {
    const table = document.querySelector('table');
    const headers = table.querySelectorAll('th');

    headers.forEach((th, index) => {
        // Skip Action column (index 0)
        if (index > 0) {
            th.addEventListener('click', () => sortTable(index));
        }

        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        th.appendChild(resizer);
        createResizableColumn(th, resizer);
    });
}

// Sort State
let sortDirection = 1;
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

    rows.forEach(row => tbody.appendChild(row));
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

function initDrawerResize() {
    const drawer = document.getElementById('drawer');
    const resizer = drawer.querySelector('.drawer-resizer');

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
        const dx = x - e.clientX;
        const newWidth = w + dx;
        if (newWidth > 200 && newWidth < window.innerWidth * 0.9) {
            drawer.style.width = `${newWidth}px`;
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

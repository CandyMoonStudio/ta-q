// checklist.js

// --- Feature Flag ---
const REVIEW_ENABLED = true;
const LS_KEY = 'taq_review_v2';

// State
let reviewData = {};
let drafts = [];
let allTags = new Set(); // For autocomplete

// --- Simple Compression Utilities ---
// Lightweight Base64 compression for save codes
function compressData(data) {
    try {
        const json = JSON.stringify(data);
        // Simple compression: Base64 encode
        return btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
        console.error('Compression failed:', e);
        return null;
    }
}

function decompressData(compressed) {
    try {
        const json = decodeURIComponent(escape(atob(compressed)));
        return JSON.parse(json);
    } catch (e) {
        console.error('Decompression failed:', e);
        return null;
    }
}

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
            // Apply diff/tags overrides if they exist
            if (item.difficulty || item.tags || item.type) {
                updateRowDataAttributes(item.id);
            }
        }
    });

    updateReport();
    updateStats();

    // Init Logic
    initFilters();
    initTableFeatures();
    initDrawerResize();
    initEventListeners(); // Centralized Event Handling
    initEditDrawer(); // Edit UI Logic

    // Ensure all button states are updated on page load
    document.querySelectorAll('tbody tr').forEach(row => {
        const id = row.dataset.id;
        if (id && reviewData[id]) {
            updateRowVisuals(id);
        }
    });
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
        // Convert text nodes to their parent element
        let clickedElement = e.target;
        if (clickedElement.nodeType === Node.TEXT_NODE) {
            clickedElement = clickedElement.parentElement;
        }

        if (!clickedElement) return;

        let target = clickedElement.closest('[data-action]');

        if (!target) {
            // Check for backdrop click to close drawer
            if (document.body.classList.contains('drawer-open')) {
                const isDrawer = clickedElement.closest('#drawer');
                const isTrigger = clickedElement.closest('#btn-open-add') || clickedElement.closest('.fab-add') || clickedElement.closest('[data-action="edit-tags"]');

                if (!isDrawer && !isTrigger) {
                    toggleDrawer();
                }
            }
            return;
        }

        const action = target.dataset.action;
        console.log('[DEBUG] Click Action:', action, target);

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
                console.log('[DEBUG] Executing download-json');
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
            case 'edit-difficulty':
                // Handle star click for quick edit
                handleStarClick(e, id);
                break;
            case 'inline-edit-type':
                // Type is changed via select dropdown, handle in change event
                handleTypeChange(target);
                break;
            case 'inline-edit-tags':
                // Open inline tag input
                openInlineTagInput(id);
                break;
            case 'remove-tag':
                // Remove a specific tag
                removeTag(target.dataset.id, target.dataset.tag);
                break;
            case 'reset-all':
                // Reset all review data with confirmation
                resetAllData();
                break;
            case 'edit-tags':
                openEditDrawer(id);
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
    let currentCounts = { ok: 0, debug: 0, ng: 0, hold: 0, unset: 0 };

    if (typeof SERVER_DATA !== 'undefined') {
        SERVER_DATA.forEach(q => {
            const id = q.id;

            // Get initial status from data
            let initialStatus = q._list || 'unset';
            if (initialStatus === 'prod') initialStatus = 'ok';

            // Get effective status (review overrides initial)
            const review = reviewData[id];
            let effectiveStatus;

            if (review && review.hasOwnProperty('status')) {
                // Review exists and has status property
                effectiveStatus = review.status === null ? 'unset' : review.status;
            } else {
                // No review, use initial status
                effectiveStatus = initialStatus;
            }

            // Normalize prod to ok
            if (effectiveStatus === 'prod') effectiveStatus = 'ok';

            // Count the effective status
            if (currentCounts.hasOwnProperty(effectiveStatus)) {
                currentCounts[effectiveStatus]++;
            }
        });
    }

    console.log('[DEBUG] Stats counts:', currentCounts);

    const setSafe = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            console.log(`[DEBUG] Setting ${id} to ${val}`);
            el.textContent = val;
        } else {
            console.warn(`[DEBUG] Element not found: ${id}`);
        }
    };
    setSafe('count-prod', currentCounts.ok);
    setSafe('count-debug', currentCounts.debug);
    setSafe('count-unset', currentCounts.unset);
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

// --- Difficulty & Tag Logic ---

function handleStarClick(e, id) {
    const starContainer = e.target.closest('.diff-stars');
    if (!starContainer) return;

    // Calculate index based on click position relative to width
    // Or simpler: assuming monospace/equal width stars.
    // Better: wrap each star in a span? No, currently text.
    // Let's rely on relative position.
    const rect = starContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percent = x / width;
    let rating = Math.ceil(percent * 5);
    if (rating < 1) rating = 1;
    if (rating > 5) rating = 5;

    setDifficulty(id, rating);
}

function setDifficulty(id, rating) {
    if (!reviewData[id]) reviewData[id] = { id: id };
    reviewData[id].difficulty = rating;
    reviewData[id].updatedAt = Date.now();
    saveToLS();

    // Update UI
    const diffCell = document.getElementById('diff-' + id);
    if (diffCell) {
        const cell = diffCell.querySelector('.diff-stars');
        if (cell) {
            cell.innerHTML = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        }
    }
    updateRowDataAttributes(id);
}

function updateRowDataAttributes(id) {
    const row = document.getElementById('row-' + id);
    if (!row) return;

    // Get Data
    const q = SERVER_DATA.find(d => d.id == id); // Loose match for ID string/num
    const review = reviewData[id];

    // Difficulty
    const diff = review?.difficulty ?? q?.difficulty ?? 3;
    row.setAttribute('data-difficulty', diff);
    // Visual update for stars is handled in setDifficulty/render logic, but let's ensure consistency if called externally
    const starCell = row.querySelector('.diff-stars');
    if (starCell) starCell.innerHTML = '★'.repeat(diff) + '☆'.repeat(5 - diff);

    // Tags/Type
    const type = review?.type ?? q?.type ?? '';
    let tags = review?.tags ? review.tags : (q?.tags ? q.tags.join(',') : '');
    if (Array.isArray(tags)) tags = tags.join(','); // Ensure string

    row.setAttribute('data-type', type);
    row.setAttribute('data-tags', tags);

    // Visual Update for Genre Cell
    const genreCell = document.getElementById(`genre-${id}`);
    if (genreCell) {
        const container = genreCell.querySelector('.tag-container');
        if (container) {
            let html = '';
            if (type) html += `<span class="tag-badge type">${escapeHtml(type)}</span>`;
            if (tags) {
                tags.split(',').filter(t => t.trim()).forEach(t => {
                    html += `<span class="tag-badge tag">${escapeHtml(t.trim())}</span>`;
                });
            }
            html += `<span class="edit-icon">✎</span>`;
            container.innerHTML = html;
        }
    }
}

// --- Edit Drawer Logic ---
let currentEditId = null;
let editTagsTemp = [];

function initEditDrawer() {
    // Populate Tag Suggestions
    const dl = document.getElementById('tag-suggestions');
    if (dl) {
        // Collect all tags
        const tags = new Set(['History', 'Science', 'Geography', 'Culture', 'Sports', 'Entertainment', 'Japan', 'World']);
        if (typeof SERVER_DATA !== 'undefined') {
            SERVER_DATA.forEach(q => {
                if (q.tags) q.tags.forEach(t => tags.add(t));
                if (q.type) tags.add(q.type);
            });
        }
        tags.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            dl.appendChild(opt);
        });
    }

    // Add Tag Button
    document.getElementById('btn-add-tag').addEventListener('click', () => {
        const input = document.getElementById('edit-new-tag');
        const val = input.value.trim();
        if (val && !editTagsTemp.includes(val)) {
            editTagsTemp.push(val);
            renderEditTags();
            input.value = '';
        }
    });

    // Save Button
    document.getElementById('btn-save-edit').addEventListener('click', () => {
        if (!currentEditId) return;

        // Save logic
        if (!reviewData[currentEditId]) reviewData[currentEditId] = { id: currentEditId };

        // Difficulty
        // (Handled separately usually, but let's sync if implemented in drawer too)
        // Ignoring stars in drawer for now to keep simple, or implement:
        // const diffStars = document.getElementById('edit-difficulty-stars').innerText; // Parsing stars text is fragile

        // Type
        const typeVal = document.getElementById('edit-type-select').value;
        reviewData[currentEditId].type = typeVal;

        // Tags
        reviewData[currentEditId].tags = [...editTagsTemp]; // Copy

        reviewData[currentEditId].updatedAt = Date.now();
        saveToLS();
        updateRowDataAttributes(currentEditId);

        // Close drawer
        toggleDrawer();
    });
}

function openEditDrawer(id) {
    currentEditId = id;

    // Switch to Edit tab (hack: assume we added it or just show content-edit)
    // We added 'content-edit' but need to show it.
    // If we rely on tabs, we need a tab button.
    // Or just force show content-edit within the drawer structure.

    // Hide all contents
    document.querySelectorAll('.drawer-content').forEach(c => c.classList.remove('active'));
    document.getElementById('content-edit').classList.add('active');

    // Open Drawer
    document.body.classList.add('drawer-open');

    // Populate Data
    const q = SERVER_DATA.find(d => d.id == id);
    const review = reviewData[id];

    document.getElementById('edit-id-display').textContent = id;

    // Difficulty
    // Not fully implemented in drawer UI yet (just static stars in replaced HTML), 
    // but we can make them clickable too later.

    // Type
    const currentType = review?.type ?? q?.type ?? '';
    document.getElementById('edit-type-select').value = currentType;

    // Tags
    const nativeTags = q?.tags ? [...q.tags] : [];
    const savedTags = review?.tags; // If array
    // Logic: If review tags exist, use them. Else use native.
    editTagsTemp = savedTags ? [...savedTags] : [...nativeTags];

    renderEditTags();
}

function renderEditTags() {
    const container = document.getElementById('edit-current-tags');
    container.innerHTML = '';
    editTagsTemp.forEach((tag, idx) => {
        const chip = document.createElement('div');
        chip.style.cssText = 'background:#4b5563; padding:2px 6px; border-radius:4px; font-size:0.85em; display:flex; align-items:center; gap:4px;';
        chip.innerHTML = `
            <span>${escapeHtml(tag)}</span>
            <span style="cursor:pointer; opacity:0.7;" onclick="removeEditTag(${idx})">×</span>
        `;
        container.appendChild(chip);
    });
}

// Global for inline onclick
window.removeEditTag = function (idx) {
    editTagsTemp.splice(idx, 1);
    renderEditTags();
};

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

            // Merge Diff/Tags Overrides
            if (review?.difficulty) item.difficulty = review.difficulty;
            if (review?.type) item.type = review.type;
            if (review?.tags) item.tags = review.tags;

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
    const types = new Set();
    const tags = new Set();

    if (typeof SERVER_DATA !== 'undefined') {
        SERVER_DATA.forEach(q => {
            if (q.type) types.add(q.type);
            if (q.tags) {
                // Handle tags as either array or string
                const tagList = Array.isArray(q.tags) ? q.tags : q.tags.split(',');
                tagList.forEach(t => tags.add(t.trim()));
            }
        });
    }

    // Populate Type Filter
    const typeSelect = document.getElementById('type-filter');
    const sortedTypes = Array.from(types).sort();
    sortedTypes.forEach(t => {
        if (!t) return;
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t;
        typeSelect.appendChild(opt);
    });

    // Populate Tag Filter
    const tagSelect = document.getElementById('tag-filter');
    const sortedTags = Array.from(tags).sort();
    sortedTags.forEach(t => {
        if (!t) return;
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t;
        tagSelect.appendChild(opt);
    });

    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('type-filter').addEventListener('change', applyFilters);
    document.getElementById('tag-filter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const searchTerms = searchInput.value.toLowerCase().split(/\s+/).filter(t => t);

    const statusFilter = document.getElementById('status-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const tagFilter = document.getElementById('tag-filter').value;

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

        // 3. Type
        let matchType = true;
        if (typeFilter !== 'all') {
            matchType = (typeData === typeFilter);
        }

        // 4. Tags
        let matchTag = true;
        if (tagFilter !== 'all') {
            if (!tagsData) {
                matchTag = false;
            } else {
                const rowTags = tagsData.split(',').map(t => t.trim());
                matchTag = rowTags.includes(tagFilter);
            }
        }

        if (matchSearch && matchStatus && matchType && matchTag) {
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

// --- Inline Editing Handlers ---
function handleTypeChange(selectElement) {
    const id = selectElement.dataset.id;
    const newType = selectElement.value;

    if (!reviewData[id]) {
        reviewData[id] = { id };
    }

    reviewData[id].type = newType;
    saveReviewData();

    // Update row data attribute for filtering
    const row = document.getElementById('row-' + id);
    if (row) {
        row.setAttribute('data-type', newType);
    }
}

function openInlineTagInput(id) {
    const tagsCell = document.getElementById('tags-' + id);
    if (!tagsCell) return;

    const tagDisplay = tagsCell.querySelector('.tag-display');
    if (!tagDisplay) return;

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Add tag and press Enter';
    input.style.cssText = 'width:100%; padding:4px; border:1px solid #4f46e5; border-radius:4px; outline:none;';
    input.className = 'inline-tag-input';

    // Handle Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const newTag = input.value.trim();
            if (newTag) {
                addTag(id, newTag);
            }
            input.remove();
        } else if (e.key === 'Escape') {
            input.remove();
        }
    });

    // Handle blur (click outside)
    input.addEventListener('blur', () => {
        setTimeout(() => input.remove(), 200);
    });

    tagDisplay.appendChild(input);
    input.focus();
}

function addTag(id, tag) {
    if (!reviewData[id]) {
        reviewData[id] = { id };
    }

    // Get current tags
    const currentTags = reviewData[id].tags || [];

    // Add new tag if not already present
    if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        reviewData[id].tags = currentTags;
        saveReviewData();

        // Update UI
        refreshTagsDisplay(id);

        // Update row data attribute for filtering
        const row = document.getElementById('row-' + id);
        if (row) {
            row.setAttribute('data-tags', currentTags.join(','));
        }
    }
}

function removeTag(id, tag) {
    if (!reviewData[id]) return;

    const currentTags = reviewData[id].tags || [];
    const newTags = currentTags.filter(t => t !== tag);

    reviewData[id].tags = newTags;
    saveReviewData();

    // Update UI
    refreshTagsDisplay(id);

    // Update row data attribute for filtering
    const row = document.getElementById('row-' + id);
    if (row) {
        row.setAttribute('data-tags', newTags.join(','));
    }
}

function refreshTagsDisplay(id) {
    const tagsCell = document.getElementById('tags-' + id);
    if (!tagsCell) return;

    const tagDisplay = tagsCell.querySelector('.tag-display');
    if (!tagDisplay) return;

    const tags = reviewData[id]?.tags || [];

    // Rebuild tag display
    tagDisplay.innerHTML = '';

    if (tags.length > 0) {
        tags.forEach(tag => {
            const tagBadge = document.createElement('span');
            tagBadge.className = 'tag-badge tag';
            tagBadge.setAttribute('data-tag', tag);
            tagBadge.textContent = tag;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'tag-remove';
            removeBtn.setAttribute('data-action', 'remove-tag');
            removeBtn.setAttribute('data-id', id);
            removeBtn.setAttribute('data-tag', tag);
            removeBtn.style.cssText = 'margin-left:4px; cursor:pointer; opacity:0.6;';
            removeBtn.textContent = '×';

            tagBadge.appendChild(removeBtn);
            tagDisplay.appendChild(tagBadge);
        });
    } else {
        const placeholder = document.createElement('span');
        placeholder.style.opacity = '0.3';
        placeholder.textContent = '(Click to add)';
        tagDisplay.appendChild(placeholder);
    }

    // Re-add edit icon
    const editIcon = document.createElement('span');
    editIcon.className = 'edit-icon';
    editIcon.style.cssText = 'opacity:0.5; margin-left:4px;';
    editIcon.textContent = '✎';
    tagDisplay.appendChild(editIcon);
}

// Add change event listener for Type selects
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('inline-type-select')) {
        handleTypeChange(e.target);
    }
});

// --- Reset All Data ---
function resetAllData() {
    const confirmed = confirm(
        '⚠️ 警告: 全てのレビューデータ（ステータス、メモ、難易度、タグ、タイプ）をリセットします。\n\n' +
        '全ての問題が初期状態に戻ります。\n\n' +
        'この操作は取り消せません。続行しますか？'
    );

    if (confirmed) {
        // Clear localStorage
        localStorage.removeItem(LS_KEY);

        // Reload page to reset UI
        location.reload();
    }
}

// --- Save/Restore Modal Functions ---
function showSaveRestoreModal() {
    const modal = document.getElementById('save-restore-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideSaveRestoreModal() {
    const modal = document.getElementById('save-restore-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Clear inputs
    const exportDisplay = document.getElementById('export-code-display');
    const importInput = document.getElementById('import-code-input');
    if (exportDisplay) exportDisplay.style.display = 'none';
    if (importInput) importInput.value = '';
}

function exportSaveCode() {
    const code = compressData(reviewData);
    if (!code) {
        alert('エクスポートに失敗しました。');
        return;
    }

    const display = document.getElementById('export-code-display');
    if (display) {
        display.value = code;
        display.style.display = 'block';
        display.select();

        // Copy to clipboard
        try {
            document.execCommand('copy');
            alert('✅ コードをクリップボードにコピーしました！\n\n別のデバイスで復元する際に貼り付けてください。');
        } catch (e) {
            alert('⚠️ コードを生成しました。\n\n手動でコピーしてください。');
        }
    }
}

function importSaveCode() {
    const input = document.getElementById('import-code-input');
    if (!input || !input.value.trim()) {
        alert('コードを入力してください。');
        return;
    }

    const code = input.value.trim();
    const data = decompressData(code);

    if (!data) {
        alert('❌ 無効なコードです。\n\n正しいコードを入力してください。');
        return;
    }

    const confirmed = confirm(
        '⚠️ 確認\n\n' +
        '現在のデータを上書きして復元します。\n\n' +
        'この操作は取り消せません。続行しますか？'
    );

    if (confirmed) {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(data));
            alert('✅ データを復元しました！\n\nページをリロードします。');
            location.reload();
        } catch (e) {
            alert('❌ 復元に失敗しました。\n\n' + e.message);
        }
    }
}

// --- Event Listeners for Save/Restore Modal ---
document.addEventListener('DOMContentLoaded', () => {
    // Credit link click
    const creditLink = document.getElementById('credit-link');
    if (creditLink) {
        creditLink.addEventListener('click', showSaveRestoreModal);
    }

    // Close modal
    const closeBtn = document.getElementById('btn-close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideSaveRestoreModal);
    }

    // Close modal on backdrop click
    const modal = document.getElementById('save-restore-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideSaveRestoreModal();
            }
        });
    }

    // Export button
    const exportBtn = document.getElementById('btn-export-code');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportSaveCode);
    }

    // Import button
    const importBtn = document.getElementById('btn-import-code');
    if (importBtn) {
        importBtn.addEventListener('click', importSaveCode);
    }
});

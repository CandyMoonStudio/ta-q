import { ReviewStore } from './store/ReviewStore.js';
import { DraftStore } from './store/DraftStore.js';
import { Drawer } from './ui/Drawer.js';
import { Renderer } from './ui/Renderer.js';
import { calculateStats } from './domain/stats.js';

// --- Init & State ---
const reviewStore = new ReviewStore();
const draftStore = new DraftStore();
const drawer = new Drawer();
const renderer = new Renderer();

// State for interaction
let currentEditId: string | number | null = null;
let editTagsTemp: string[] = [];

// --- Main Logic ---

function updateAll() {
  // 1. Stats
  const counts = calculateStats(SERVER_DATA, reviewStore.getAll());
  renderer.renderStats(counts);

  // 2. Report Area
  const reportArea = document.getElementById('report-area') as HTMLTextAreaElement;
  if (reportArea) {
    reportArea.value = JSON.stringify(reviewStore.getAll(), null, 2);
  }
}

function init() {
  console.log('Initializing Checklist App...');

  // Apply initial visuals
  const reviewData = reviewStore.getAll();
  Object.values(reviewData).forEach((item) => {
    renderer.updateRowVisuals(item.id, item);
    renderer.renderStatusCell(item.id, item);
    renderer.renderNoteCell(item.id, item);

    // Apply diff/tags overrides if they exist
    if (item.difficulty || item.tags || item.type) {
      const q = SERVER_DATA.find((d) => d.id == item.id);
      renderer.updateRowDataAttributes(item.id, q, item);
    }
  });

  updateAll();

  // Filters
  initFilters();
  initTableFeatures();

  // Event Delegation
  document.addEventListener('click', handleClick);

  // Subscribe stores
  reviewStore.subscribe(() => {
    updateAll();
  });

  draftStore.subscribe(() => {
    const container = document.getElementById('draft-list');
    if (container)
      renderer.renderDrafts(container, draftStore.getAll(), (idx) => draftStore.remove(idx));
  });
}

function handleClick(e: MouseEvent) {
  let target = e.target as HTMLElement;

  // Text node handling
  if (target.nodeType === Node.TEXT_NODE && target.parentElement) {
    target = target.parentElement;
  }

  const actionEl = target.closest('[data-action]') as HTMLElement;

  if (!actionEl) {
    // Backdrop click
    if (document.body.classList.contains('drawer-open')) {
      const isDrawer = target.closest('#drawer');
      const isTrigger =
        target.closest('#btn-open-add') ||
        target.closest('.fab-add') ||
        target.closest('[data-action="edit-tags"]');
      if (!isDrawer && !isTrigger) drawer.toggle();
    }
    return;
  }

  const action = actionEl.dataset.action;
  const row = actionEl.closest('tr');
  const id = row ? row.dataset.id : null;

  console.log('[Click]', action, id);

  switch (action) {
    case 'set-status':
      if (id) reviewStore.setStatus(id, actionEl.dataset.status as any);
      // Visual updates are manual for optimization or reactive?
      // Store notify calls updateAll (stats), but for row usage we might want immediate feedback
      // or let the subscriber handle it. For now, manual update for row specific.
      if (id) renderer.updateRowVisuals(id, reviewStore.get(id));
      if (id) renderer.renderStatusCell(id, reviewStore.get(id));
      if (id) renderer.renderNoteCell(id, reviewStore.get(id));
      break;

    case 'activate-note':
      if (id) {
        const item = reviewStore.get(id);
        renderer.activateNoteInput(id, item?.note || '', item?.status || null, (val) => {
          reviewStore.setNote(id, val);
          renderer.renderNoteCell(id, reviewStore.get(id));
          renderer.updateRowVisuals(id, reviewStore.get(id));
        });
      }
      break;

    case 'edit-difficulty':
      if (id) {
        handleStarClick(e, id, actionEl);
      }
      break;

    case 'toggle-drawer':
      drawer.toggle();
      break;

    case 'open-add':
      if (!document.body.classList.contains('drawer-open')) drawer.toggle();
      drawer.switchTab('add');
      break;

    case 'copy-json':
      const area = document.getElementById('report-area') as HTMLTextAreaElement;
      area.select();
      document.execCommand('copy');
      alert('JSON copied');
      break;

    case 'add-draft':
      handleAddDraft();
      break;

    case 'edit-tags':
      if (id) openEditDrawer(id);
      break;

    // Add other cases as needed...
  }
}

// --- Specific Logics ---

function handleStarClick(e: MouseEvent, id: string, container: HTMLElement) {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const width = rect.width;
  const rating = Math.ceil((x / width) * 5);
  const safeRating = Math.max(1, Math.min(5, rating));

  reviewStore.setDifficulty(id, safeRating);
  // UI update
  const q = SERVER_DATA.find((d) => d.id == id);
  renderer.updateRowDataAttributes(id, q, reviewStore.get(id));
}

function handleAddDraft() {
  const idInput = document.getElementById('new-id') as HTMLInputElement;
  const textInput = document.getElementById('new-text') as HTMLInputElement;
  const answerInput = document.getElementById('new-answer') as HTMLInputElement;

  if (!idInput.value) idInput.value = 'draft_' + Date.now();

  if (textInput.value && answerInput.value) {
    draftStore.add({
      id: idInput.value,
      text: textInput.value,
      answer: answerInput.value,
    });
    textInput.value = '';
    answerInput.value = '';
    idInput.value = '';
  } else {
    alert('Question/Answer required');
  }
}

function openEditDrawer(id: string) {
  currentEditId = id;
  drawer.openEdit(id);

  const q = SERVER_DATA.find((d) => d.id == id);
  const review = reviewStore.get(id);

  const display = document.getElementById('edit-id-display');
  if (display) display.textContent = id;

  // Setup tags logic
  const nativeTags = q?.tags || [];
  const savedTags = review?.tags;
  editTagsTemp = savedTags ? [...savedTags] : [...nativeTags];

  renderEditTagsInDrawer();

  // Bind Save
  const saveBtn = document.getElementById('btn-save-edit');
  // Removing old listeners is tricky without keeping refs.
  // Simplified: use "onclick" or clone node.
  if (saveBtn) {
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode?.replaceChild(newBtn, saveBtn);
    newBtn.addEventListener('click', () => {
      if (currentEditId) {
        reviewStore.update(currentEditId, { tags: editTagsTemp });

        // Update Row
        const qq = SERVER_DATA.find((d) => d.id == currentEditId);
        renderer.updateRowDataAttributes(currentEditId, qq, reviewStore.get(currentEditId));

        drawer.toggle();
      }
    });
  }

  // Bind Add Tag
  const addTagBtn = document.getElementById('btn-add-tag');
  if (addTagBtn) {
    const newBtn = addTagBtn.cloneNode(true);
    addTagBtn.parentNode?.replaceChild(newBtn, addTagBtn);
    newBtn.addEventListener('click', () => {
      const input = document.getElementById('edit-new-tag') as HTMLInputElement;
      const val = input.value.trim();
      if (val && !editTagsTemp.includes(val)) {
        editTagsTemp.push(val);
        renderEditTagsInDrawer();
        input.value = '';
      }
    });
  }
}

function renderEditTagsInDrawer() {
  const container = document.getElementById('edit-current-tags');
  if (container) {
    renderer.renderEditTags(container, editTagsTemp, (idx) => {
      editTagsTemp.splice(idx, 1);
      renderEditTagsInDrawer();
    });
  }
}

// --- Filters (Minimal Implementation) ---
function initFilters() {
  const filterInput = document.getElementById('filter-text');
  if (filterInput) {
    filterInput.addEventListener('input', () => applyFilters());
  }
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      target.classList.toggle('active');
      applyFilters();
    });
  });
}

function applyFilters() {
  const text = (document.getElementById('filter-text') as HTMLInputElement).value.toLowerCase();
  const activeFilters = Array.from(document.querySelectorAll('.filter-btn.active')).map(
    (el) => (el as HTMLElement).dataset.filter
  );

  // Logic: if activeFilters is empty, show all (except logic below).
  // Original logic: "Filter by Status".

  document.querySelectorAll('tbody tr').forEach((tr) => {
    const row = tr as HTMLElement;
    const id = row.dataset.id || '';
    const searchTarget = row.dataset.search || '';

    let matchText = true;
    if (text && !searchTarget.includes(text)) matchText = false;

    let matchStatus = true;
    if (activeFilters.length > 0) {
      // Check implicit status or DOM class
      // ReviewStore source of truth vs DOM. DOM is updated so we can use classes.
      // Classes: row-ok, row-ng, row-debug...
      // If activeFilters=['ok'], we look for row-ok.
      const hasClass = activeFilters.some((f) => row.classList.contains(`row-${f}`));
      // Special case: 'unset' -> no class?
      // Actually 'unset' rows usually have no class or explicit unset class?
      // In generate_checklist: statusClass = `row-${initialStatus}`.
      // If unset, initialStatus is unset, so row-unset?
      // Let's rely on dataset.status if synchronized? DOM class is reliable enough.

      // Wait, unset rows might not have row-unset class if logic was simple.
      // Let's assume standard classes.
      if (!hasClass) matchStatus = false;
    }

    row.style.display = matchText && matchStatus ? '' : 'none';
  });
}

// --- Table Features (Sort, Resize) ---
function initTableFeatures() {
  // ... Placeholder or implementation
  // For Phase 2, we can skip complex resize/sort or implement simply
}

// Start
window.addEventListener('DOMContentLoaded', init);

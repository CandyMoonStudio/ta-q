import { ReviewData, ReviewItem, Question } from '../types.js';
import { escapeHtml } from '../../utils/htmlEscape.js'; // Import from shared utils if possible, or duplicate/move
// We need escapeHtml here. Let's assume we can import it or define it.
// Ideally we move utility to a shared location, but for now let's redefine simple one to avoid relative path hell if not configured.
// Actually, ../../utils/htmlEscape.ts is available.

function escape(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class Renderer {
  public updateRowVisuals(id: string | number, reviewItem?: ReviewItem) {
    const row = document.getElementById('row-' + id);
    if (!row) return;

    const status = reviewItem ? reviewItem.status : null;

    row.classList.remove('row-ok', 'row-ng', 'row-debug', 'row-hold', 'row-note');
    row.querySelectorAll('.btn-icon').forEach((btn) => btn.classList.remove('active'));

    if (status) {
      row.classList.add('row-' + status);
      const btn = row.querySelector(`[data-status="${status}"]`);
      if (btn) btn.classList.add('active');
    }

    if (reviewItem && reviewItem.note) {
      const btnNote = row.querySelector('[data-action="activate-note"]');
      if (btnNote) btnNote.classList.add('active');
      if (!status) row.classList.add('row-note');
    }
  }

  public renderStatusCell(id: string | number, reviewItem?: ReviewItem) {
    const badgeCell = document.getElementById(`badge-${id}`);
    if (!badgeCell) return;

    badgeCell.innerHTML = '';

    if (reviewItem && reviewItem.status) {
      const span = document.createElement('span');
      span.className = `status-badge ${reviewItem.status}`;
      span.textContent = reviewItem.status.toUpperCase();
      badgeCell.appendChild(span);
    }
  }

  public renderNoteCell(id: string | number, reviewItem?: ReviewItem) {
    const noteCell = document.getElementById(`note-${id}`);
    if (!noteCell) return;
    if (noteCell.querySelector('input')) return; // Editing

    noteCell.innerHTML = '';

    if (reviewItem && reviewItem.note) {
      const span = document.createElement('span');
      span.className = 'note-text';
      span.textContent = reviewItem.note;
      noteCell.appendChild(span);
    }
  }

  public activateNoteInput(
    id: string | number,
    currentNote: string,
    currentStatus: string | null,
    onBlur: (val: string) => void
  ) {
    const noteCell = document.getElementById('note-' + id);
    if (!noteCell) return;
    if (noteCell.querySelector('input')) return;

    noteCell.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'inline-input-container';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `input-${id}`;
    input.className = 'inline-input';
    input.value = currentNote;
    input.dataset.id = String(id);

    if (currentStatus === 'ng') {
      input.placeholder = 'NG理由を入力...';
      input.classList.add('input-warn');
    } else {
      input.placeholder = 'メモを入力...';
    }

    input.addEventListener('blur', (e) => {
      onBlur((e.target as HTMLInputElement).value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });

    container.appendChild(input);
    noteCell.appendChild(container);

    setTimeout(() => {
      input.focus();
    }, 50);
  }

  public renderStats(counts: any) {
    const setSafe = (id: string, val: any) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setSafe('count-prod', counts.ok);
    setSafe('count-debug', counts.debug);
    setSafe('count-unset', counts.unset);
    setSafe('count-ng', counts.ng);
    setSafe('count-hold', counts.hold);
  }

  public renderEditTags(container: HTMLElement, tags: string[], onRemove: (idx: number) => void) {
    container.innerHTML = '';
    tags.forEach((tag, idx) => {
      const chip = document.createElement('div');
      chip.style.cssText =
        'background:#4b5563; padding:2px 6px; border-radius:4px; font-size:0.85em; display:flex; align-items:center; gap:4px;';
      chip.innerHTML = `
                <span>${escape(tag)}</span>
            `;
      const removeBtn = document.createElement('span');
      removeBtn.style.cssText = 'cursor:pointer; opacity:0.7;';
      removeBtn.textContent = '×';
      removeBtn.onclick = () => onRemove(idx);

      chip.appendChild(removeBtn);
      container.appendChild(chip);
    });
  }

  public renderDrafts(container: HTMLElement, drafts: any[], onRemove: (idx: number) => void) {
    container.innerHTML = '';
    drafts.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'draft-item';

      const safeText = escape(item.text);
      const safeAnswer = escape(item.answer);

      el.innerHTML = `
            <div>
                <div style="font-weight:700; color:#a5f3fc">${safeText}</div>
                <div style="font-size:0.8em">${safeAnswer}</div>
            </div>
            `;

      const removeBtn = document.createElement('span');
      removeBtn.className = 'draft-remove';
      removeBtn.textContent = '×';
      removeBtn.onclick = () => onRemove(idx); // Direct binding instead of delegation for now inside this render

      el.appendChild(removeBtn);
      container.appendChild(el);
    });
  }

  public updateRowDataAttributes(
    id: string | number,
    question: Question | undefined,
    review: ReviewItem | undefined
  ) {
    const row = document.getElementById('row-' + id);
    if (!row) return;

    // Difficulty
    const diff = review?.difficulty ?? question?.difficulty ?? 3;
    row.setAttribute('data-difficulty', String(diff));

    const starCell = row.querySelector('.diff-stars');
    if (starCell) starCell.innerHTML = '★'.repeat(diff) + '☆'.repeat(5 - diff);

    // Tags/Type
    const type = review?.type ?? question?.type ?? '';
    let tags = review?.tags ? review.tags : question?.tags ? question.tags.join(',') : '';
    if (Array.isArray(tags)) tags = tags.join(',');

    row.setAttribute('data-type', type);
    row.setAttribute('data-tags', String(tags));

    // Visual Update for Genre Cell (Simplified logic, mimicking original)
    // Original code had genre-id cell but it's not in the template we saw?
    // Ah, template has 'type-cell' and 'tags-cell'. Original code 472: `genre-${id}` might be custom or outdated.
    // Let's stick to updating attributes which CSS selectors might use.
    // The template has explicit cells for Type and Tags, so we should update them if possible.
    // For Phase 2, updating row attributes is key for filtering.
    // Detailed cell re-rendering can be added if needed.
  }
}

'use strict';
(() => {
  var S = 'taq_review_v2',
    b = class {
      data = {};
      listeners = [];
      constructor() {
        this.load();
      }
      load() {
        try {
          let t = localStorage.getItem(S);
          t && (this.data = JSON.parse(t));
        } catch (t) {
          (console.error('Failed to load review data', t), (this.data = {}));
        }
      }
      save() {
        try {
          (localStorage.setItem(S, JSON.stringify(this.data)), this.notify());
        } catch (t) {
          console.error('Save failed', t);
        }
      }
      get(t) {
        return this.data[String(t)];
      }
      getAll() {
        return this.data;
      }
      setStatus(t, n) {
        let e = String(t);
        (this.data[e] || (this.data[e] = { id: t, status: null, note: '', updatedAt: 0 }),
          this.data[e].status === n ? (this.data[e].status = null) : (this.data[e].status = n),
          (this.data[e].updatedAt = Date.now()),
          this.save());
      }
      setNote(t, n) {
        let e = String(t),
          s = n.trim();
        (this.data[e] || (this.data[e] = { id: t, status: null, note: '', updatedAt: 0 }),
          this.data[e].note !== s &&
            ((this.data[e].note = s), (this.data[e].updatedAt = Date.now()), this.save()));
      }
      setDifficulty(t, n) {
        let e = String(t);
        (this.data[e] || (this.data[e] = { id: e, status: null, note: '', updatedAt: 0 }),
          (this.data[e].difficulty = n),
          (this.data[e].updatedAt = Date.now()),
          this.save());
      }
      update(t, n) {
        let e = String(t);
        (this.data[e] || (this.data[e] = { id: e, status: null, note: '', updatedAt: 0 }),
          Object.assign(this.data[e], n),
          (this.data[e].updatedAt = Date.now()),
          this.save());
      }
      reset() {
        ((this.data = {}), this.save());
      }
      subscribe(t) {
        return (
          this.listeners.push(t),
          () => {
            this.listeners = this.listeners.filter((n) => n !== t);
          }
        );
      }
      notify() {
        this.listeners.forEach((t) => t());
      }
    };
  var h = class {
    drafts = [];
    listeners = [];
    add(t) {
      (this.drafts.push(t), this.notify());
    }
    remove(t) {
      t >= 0 && t < this.drafts.length && (this.drafts.splice(t, 1), this.notify());
    }
    getAll() {
      return [...this.drafts];
    }
    getCount() {
      return this.drafts.length;
    }
    subscribe(t) {
      return (
        this.listeners.push(t),
        () => {
          this.listeners = this.listeners.filter((n) => n !== t);
        }
      );
    }
    notify() {
      this.listeners.forEach((t) => t());
    }
  };
  var v = class {
    toggle() {
      let t = document.body;
      t.classList.contains('drawer-open')
        ? t.classList.remove('drawer-open')
        : t.classList.add('drawer-open');
    }
    switchTab(t) {
      (document.querySelectorAll('.drawer-tab-btn').forEach((s) => s.classList.remove('active')),
        document.querySelectorAll('.drawer-content').forEach((s) => s.classList.remove('active')));
      let n = document.querySelector(`.drawer-tab-btn[data-tab="${t}"]`);
      n && n.classList.add('active');
      let e = document.getElementById('content-' + t);
      e && e.classList.add('active');
    }
    openEdit(t) {
      document.querySelectorAll('.drawer-content').forEach((e) => e.classList.remove('active'));
      let n = document.getElementById('content-edit');
      (n && n.classList.add('active'), document.body.classList.add('drawer-open'));
    }
  };
  function w(i) {
    return i
      ? i
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      : '';
  }
  var y = class {
    updateRowVisuals(t, n) {
      let e = document.getElementById('row-' + t);
      if (!e) return;
      let s = n ? n.status : null;
      if (
        (e.classList.remove('row-ok', 'row-ng', 'row-debug', 'row-hold', 'row-note'),
        e.querySelectorAll('.btn-icon').forEach((a) => a.classList.remove('active')),
        s)
      ) {
        e.classList.add('row-' + s);
        let a = e.querySelector(`[data-status="${s}"]`);
        a && a.classList.add('active');
      }
      if (n && n.note) {
        let a = e.querySelector('[data-action="activate-note"]');
        (a && a.classList.add('active'), s || e.classList.add('row-note'));
      }
    }
    renderStatusCell(t, n) {
      let e = document.getElementById(`badge-${t}`);
      if (e && ((e.innerHTML = ''), n && n.status)) {
        let s = document.createElement('span');
        ((s.className = `status-badge ${n.status}`),
          (s.textContent = n.status.toUpperCase()),
          e.appendChild(s));
      }
    }
    renderNoteCell(t, n) {
      let e = document.getElementById(`note-${t}`);
      if (e && !e.querySelector('input') && ((e.innerHTML = ''), n && n.note)) {
        let s = document.createElement('span');
        ((s.className = 'note-text'), (s.textContent = n.note), e.appendChild(s));
      }
    }
    activateNoteInput(t, n, e, s) {
      let a = document.getElementById('note-' + t);
      if (!a || a.querySelector('input')) return;
      a.innerHTML = '';
      let o = document.createElement('div');
      o.className = 'inline-input-container';
      let r = document.createElement('input');
      ((r.type = 'text'),
        (r.id = `input-${t}`),
        (r.className = 'inline-input'),
        (r.value = n),
        (r.dataset.id = String(t)),
        e === 'ng'
          ? ((r.placeholder = 'NG\u7406\u7531\u3092\u5165\u529B...'), r.classList.add('input-warn'))
          : (r.placeholder = '\u30E1\u30E2\u3092\u5165\u529B...'),
        r.addEventListener('blur', (c) => {
          s(c.target.value);
        }),
        r.addEventListener('keydown', (c) => {
          c.key === 'Enter' && r.blur();
        }),
        o.appendChild(r),
        a.appendChild(o),
        setTimeout(() => {
          r.focus();
        }, 50));
    }
    renderStats(t) {
      let n = (e, s) => {
        let a = document.getElementById(e);
        a && (a.textContent = String(s));
      };
      (n('count-prod', t.ok),
        n('count-debug', t.debug),
        n('count-unset', t.unset),
        n('count-ng', t.ng),
        n('count-hold', t.hold));
    }
    renderEditTags(t, n, e) {
      ((t.innerHTML = ''),
        n.forEach((s, a) => {
          let o = document.createElement('div');
          ((o.style.cssText =
            'background:#4b5563; padding:2px 6px; border-radius:4px; font-size:0.85em; display:flex; align-items:center; gap:4px;'),
            (o.innerHTML = `
                <span>${w(s)}</span>
            `));
          let r = document.createElement('span');
          ((r.style.cssText = 'cursor:pointer; opacity:0.7;'),
            (r.textContent = '\xD7'),
            (r.onclick = () => e(a)),
            o.appendChild(r),
            t.appendChild(o));
        }));
    }
    renderDrafts(t, n, e) {
      ((t.innerHTML = ''),
        n.forEach((s, a) => {
          let o = document.createElement('div');
          o.className = 'draft-item';
          let r = w(s.text),
            c = w(s.answer);
          o.innerHTML = `
            <div>
                <div style="font-weight:700; color:#a5f3fc">${r}</div>
                <div style="font-size:0.8em">${c}</div>
            </div>
            `;
          let u = document.createElement('span');
          ((u.className = 'draft-remove'),
            (u.textContent = '\xD7'),
            (u.onclick = () => e(a)),
            o.appendChild(u),
            t.appendChild(o));
        }));
    }
    updateRowDataAttributes(t, n, e) {
      let s = document.getElementById('row-' + t);
      if (!s) return;
      let a = e?.difficulty ?? n?.difficulty ?? 3;
      s.setAttribute('data-difficulty', String(a));
      let o = s.querySelector('.diff-stars');
      o && (o.innerHTML = '\u2605'.repeat(a) + '\u2606'.repeat(5 - a));
      let r = e?.type ?? n?.type ?? '',
        c = e?.tags ? e.tags : n?.tags ? n.tags.join(',') : '';
      (Array.isArray(c) && (c = c.join(',')),
        s.setAttribute('data-type', r),
        s.setAttribute('data-tags', String(c)));
    }
  };
  function C(i, t) {
    let n = i._list || 'unset';
    n === 'prod' && (n = 'ok');
    let e;
    return (
      t && t.status !== void 0 ? (e = t.status === null ? 'unset' : t.status) : (e = n),
      e === 'prod' && (e = 'ok'),
      e
    );
  }
  function T(i, t) {
    let n = { ok: 0, debug: 0, ng: 0, hold: 0, unset: 0 };
    return (
      i.forEach((e) => {
        let s = String(e.id),
          a = t[s],
          o = C(e, a);
        Object.prototype.hasOwnProperty.call(n, o) && n[o]++;
      }),
      n
    );
  }
  var l = new b(),
    E = new h(),
    f = new v(),
    d = new y(),
    p = null,
    m = [];
  function A() {
    let i = T(SERVER_DATA, l.getAll());
    d.renderStats(i);
    let t = document.getElementById('report-area');
    t && (t.value = JSON.stringify(l.getAll(), null, 2));
  }
  function x() {
    console.log('Initializing Checklist App...');
    let i = l.getAll();
    (Object.values(i).forEach((t) => {
      if (
        (d.updateRowVisuals(t.id, t),
        d.renderStatusCell(t.id, t),
        d.renderNoteCell(t.id, t),
        t.difficulty || t.tags || t.type)
      ) {
        let n = SERVER_DATA.find((e) => e.id == t.id);
        d.updateRowDataAttributes(t.id, n, t);
      }
    }),
      A(),
      B(),
      document.addEventListener('click', R),
      l.subscribe(() => {
        A();
      }),
      E.subscribe(() => {
        let t = document.getElementById('draft-list');
        t && d.renderDrafts(t, E.getAll(), (n) => E.remove(n));
      }));
  }
  function R(i) {
    let t = i.target;
    t.nodeType === Node.TEXT_NODE && t.parentElement && (t = t.parentElement);
    let n = t.closest('[data-action]');
    if (!n) {
      if (document.body.classList.contains('drawer-open')) {
        let o = t.closest('#drawer'),
          r =
            t.closest('#btn-open-add') ||
            t.closest('.fab-add') ||
            t.closest('[data-action="edit-tags"]');
        !o && !r && f.toggle();
      }
      return;
    }
    let e = n.dataset.action,
      s = n.closest('tr'),
      a = s ? s.dataset.id : null;
    switch ((console.log('[Click]', e, a), e)) {
      case 'set-status':
        (a && l.setStatus(a, n.dataset.status),
          a && d.updateRowVisuals(a, l.get(a)),
          a && d.renderStatusCell(a, l.get(a)),
          a && d.renderNoteCell(a, l.get(a)));
        break;
      case 'activate-note':
        if (a) {
          let r = l.get(a);
          d.activateNoteInput(a, r?.note || '', r?.status || null, (c) => {
            (l.setNote(a, c), d.renderNoteCell(a, l.get(a)), d.updateRowVisuals(a, l.get(a)));
          });
        }
        break;
      case 'edit-difficulty':
        a && D(i, a, n);
        break;
      case 'toggle-drawer':
        f.toggle();
        break;
      case 'open-add':
        (document.body.classList.contains('drawer-open') || f.toggle(), f.switchTab('add'));
        break;
      case 'copy-json':
        (document.getElementById('report-area').select(),
          document.execCommand('copy'),
          alert('JSON copied'));
        break;
      case 'add-draft':
        k();
        break;
      case 'edit-tags':
        a && M(a);
        break;
    }
  }
  function D(i, t, n) {
    let e = n.getBoundingClientRect(),
      s = i.clientX - e.left,
      a = e.width,
      o = Math.ceil((s / a) * 5),
      r = Math.max(1, Math.min(5, o));
    l.setDifficulty(t, r);
    let c = SERVER_DATA.find((u) => u.id == t);
    d.updateRowDataAttributes(t, c, l.get(t));
  }
  function k() {
    let i = document.getElementById('new-id'),
      t = document.getElementById('new-text'),
      n = document.getElementById('new-answer');
    (i.value || (i.value = 'draft_' + Date.now()),
      t.value && n.value
        ? (E.add({ id: i.value, text: t.value, answer: n.value }),
          (t.value = ''),
          (n.value = ''),
          (i.value = ''))
        : alert('Question/Answer required'));
  }
  function M(i) {
    ((p = i), f.openEdit(i));
    let t = SERVER_DATA.find((c) => c.id == i),
      n = l.get(i),
      e = document.getElementById('edit-id-display');
    e && (e.textContent = i);
    let s = t?.tags || [],
      a = n?.tags;
    ((m = a ? [...a] : [...s]), L());
    let o = document.getElementById('btn-save-edit');
    if (o) {
      let c = o.cloneNode(!0);
      (o.parentNode?.replaceChild(c, o),
        c.addEventListener('click', () => {
          if (p) {
            l.update(p, { tags: m });
            let u = SERVER_DATA.find((g) => g.id == p);
            (d.updateRowDataAttributes(p, u, l.get(p)), f.toggle());
          }
        }));
    }
    let r = document.getElementById('btn-add-tag');
    if (r) {
      let c = r.cloneNode(!0);
      (r.parentNode?.replaceChild(c, r),
        c.addEventListener('click', () => {
          let u = document.getElementById('edit-new-tag'),
            g = u.value.trim();
          g && !m.includes(g) && (m.push(g), L(), (u.value = ''));
        }));
    }
  }
  function L() {
    let i = document.getElementById('edit-current-tags');
    i &&
      d.renderEditTags(i, m, (t) => {
        (m.splice(t, 1), L());
      });
  }
  function B() {
    let i = document.getElementById('filter-text');
    (i && i.addEventListener('input', () => I()),
      document.querySelectorAll('.filter-btn').forEach((t) => {
        t.addEventListener('click', (n) => {
          (n.target.classList.toggle('active'), I());
        });
      }));
  }
  function I() {
    let i = document.getElementById('filter-text').value.toLowerCase(),
      t = Array.from(document.querySelectorAll('.filter-btn.active')).map((n) => n.dataset.filter);
    document.querySelectorAll('tbody tr').forEach((n) => {
      let e = n,
        s = e.dataset.id || '',
        a = e.dataset.search || '',
        o = !0;
      i && !a.includes(i) && (o = !1);
      let r = !0;
      (t.length > 0 && (t.some((u) => e.classList.contains(`row-${u}`)) || (r = !1)),
        (e.style.display = o && r ? '' : 'none'));
    });
  }
  window.addEventListener('DOMContentLoaded', x);
})();

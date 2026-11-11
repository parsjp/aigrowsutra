/* AIGrowSutra — prompt library page logic.
   Live search (debounced), category + type filters, copy-to-clipboard,
   expand-in-place and load-more pagination against the /api/prompts endpoint. */

(function () {
  'use strict';

  const PAGE_SIZE = 24;
  const state = { q: '', category: '', type: '', page: 1, total: 0, items: [], loading: false, exhausted: false };

  const grid = document.getElementById('lib-grid');
  const meta = document.getElementById('lib-meta');
  const emptyEl = document.getElementById('lib-empty');
  const spinner = document.getElementById('lib-spinner');
  const moreBtn = document.getElementById('lib-more');
  const searchBox = document.getElementById('lib-search');
  const input = document.getElementById('lib-q');
  const clearBtn = document.getElementById('lib-clear');
  const typeChips = document.getElementById('lib-types');
  const categorySelect = document.getElementById('lib-category');
  const countEl = document.getElementById('lib-count');

  /* ---------------------------------------------- helpers */
  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const escapeHtml = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  /* ---------------------------------------------- rendering */
  function promptCard(p) {
    const el = document.createElement('article');
    el.className = 'prompt-card';
    const badges = [
      `<span class="badge badge-cat">${escapeHtml(p.category)}</span>`,
      `<span class="badge badge-type">${escapeHtml(p.type)}</span>`,
    ];
    if (p.for_devs) badges.push('<span class="badge badge-dev">Dev</span>');
    el.innerHTML = `
      <div class="prompt-badges">${badges.join('')}</div>
      <h3>${escapeHtml(p.act)}</h3>
      <div class="prompt-excerpt">${escapeHtml(p.prompt)}</div>
      <footer>
        <span class="prompt-contrib" title="Contributor">${p.contributor ? 'by ' + escapeHtml(p.contributor) : 'community prompt'}</span>
        <div class="prompt-actions">
          <button class="icon-btn act-expand" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            Full
          </button>
          <button class="icon-btn act-copy" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
            Copy
          </button>
        </div>
      </footer>`;

    const excerpt = el.querySelector('.prompt-excerpt');
    const fullPrompt = p.prompt;

    el.querySelector('.act-expand').addEventListener('click', (ev) => {
      const expanded = el.classList.toggle('expanded');
      excerpt.classList.toggle('expanded', expanded);
      excerpt.style.display = expanded ? 'block' : '';
      ev.currentTarget.lastChild.textContent = expanded ? ' Less' : ' Full';
    });

    el.querySelector('.act-copy').addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      const ok = await copyText(fullPrompt);
      if (ok) {
        btn.classList.add('copied');
        btn.lastChild.textContent = ' Copied!';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.lastChild.textContent = ' Copy';
        }, 1800);
      } else {
        window.toast('Copy failed — expand the prompt and copy manually.', 'error');
      }
    });

    return el;
  }

  function renderMeta() {
    const shown = state.items.length;
    if (state.total === 0 && !state.loading) {
      meta.textContent = '';
    } else {
      meta.innerHTML = `Showing <b>${shown.toLocaleString('en-US')}</b> of <b>${state.total.toLocaleString('en-US')}</b> prompts${state.q ? ` matching “<b>${escapeHtml(state.q)}</b>”` : ''}`;
    }
  }

  /* ---------------------------------------------- data loading */
  async function fetchPrompts(page) {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);
    if (state.type) params.set('type', state.type);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    const res = await fetch('/api/prompts?' + params.toString());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function load(reset) {
    if (state.loading) return;
    state.loading = true;
    spinner.hidden = false;
    moreBtn.hidden = true;
    if (reset) {
      state.page = 1;
      state.items = [];
      state.total = 0;
      state.exhausted = false;
      grid.innerHTML = '';
      emptyEl.hidden = true;
    }
    try {
      const data = await fetchPrompts(state.page);
      state.total = data.total;
      state.items = state.items.concat(data.items);
      data.items.forEach((p) => grid.appendChild(promptCard(p)));
      state.exhausted = state.items.length >= state.total || data.items.length === 0;
      renderMeta();
      emptyEl.hidden = state.items.length !== 0;
      moreBtn.hidden = state.exhausted;
    } catch (err) {
      window.toast('Could not load prompts — is the server running?', 'error');
      meta.textContent = 'Failed to load prompts. Please retry.';
    } finally {
      state.loading = false;
      spinner.hidden = true;
    }
  }

  function reload() {
    load(true);
    syncUrl();
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);
    if (state.type) params.set('type', state.type);
    const qs = params.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  /* ---------------------------------------------- facets */
  async function loadFacets() {
    try {
      const res = await fetch('/api/prompts/facets');
      const f = await res.json();
      if (countEl && f.totalPrompts) {
        countEl.textContent = f.totalPrompts.toLocaleString('en-US');
      }
      // Only show type chips that actually exist in the dataset.
      const present = new Set(f.types.map((t) => t.name));
      typeChips.querySelectorAll('.type-chip').forEach((chip) => {
        const t = chip.dataset.type;
        if (t && !present.has(t)) chip.remove();
      });
      const current = categorySelect.value;
      categorySelect.innerHTML = '<option value="">All categories</option>';
      f.categories
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.name;
          opt.textContent = `${c.name} (${c.count})`;
          categorySelect.appendChild(opt);
        });
      categorySelect.value = current;
    } catch (e) {
      /* non-fatal */
    }
  }

  /* ---------------------------------------------- events */
  let debounceTimer;
  input.addEventListener('input', () => {
    searchBox.classList.toggle('has-value', input.value.length > 0);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.q = input.value.trim();
      reload();
    }, 320);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
      state.q = input.value.trim();
      reload();
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    state.q = '';
    searchBox.classList.remove('has-value');
    input.focus();
    reload();
  });

  typeChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.type-chip');
    if (!chip) return;
    typeChips.querySelectorAll('.type-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.type = chip.dataset.type || '';
    reload();
  });

  categorySelect.addEventListener('change', () => {
    state.category = categorySelect.value;
    reload();
  });

  moreBtn.addEventListener('click', () => {
    state.page += 1;
    load(false);
  });

  /* ---------------------------------------------- init from URL */
  const url = new URL(location);
  state.q = (url.searchParams.get('q') || '').trim();
  state.category = url.searchParams.get('category') || '';
  state.type = (url.searchParams.get('type') || '').toUpperCase() || '';
  if (state.q) {
    input.value = state.q;
    searchBox.classList.add('has-value');
  }
  if (state.type) {
    typeChips.querySelectorAll('.type-chip').forEach((c) => {
      c.classList.toggle('active', (c.dataset.type || '') === state.type);
    });
  }

  loadFacets();
  if (state.category) {
    // Wait for facets to populate the select, then load.
    const waitForOptions = setInterval(() => {
      if (categorySelect.options.length > 1) {
        clearInterval(waitForOptions);
        categorySelect.value = state.category;
        load(true);
      }
    }, 60);
    setTimeout(() => clearInterval(waitForOptions), 4000);
  } else {
    load(true);
  }
})();

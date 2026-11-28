/* Kolom cari kategori: ketik awalan -> saran muncul, ↑/↓ memilih, Enter/klik mengambil.
   Select asli tetap dipakai (disembunyikan) supaya form & logika kategori lama tidak berubah. */
(function () {
  function setup(sel) {
    if (!sel || sel.dataset.combo) return;
    sel.dataset.combo = '1';
    const wrap = document.createElement('span');
    wrap.className = 'cat-combo';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cat-combo-input';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.placeholder = 'Ketik untuk mencari kategori...';
    input.setAttribute('aria-label', 'Kategori');
    const list = document.createElement('ul');
    list.className = 'cat-combo-list';
    list.hidden = true;
    list.setAttribute('role', 'listbox');
    wrap.append(input, list);
    sel.style.display = 'none';
    sel.after(wrap);

    let items = [], active = -1;
    const norm = s => (s || '').toLowerCase().trim();
    const options = () => Array.from(sel.options).filter(o => !o.disabled);
    const special = o => o.value === '__add_new__' || o.value === '__manage_categories__';
    const curText = () => { const o = sel.options[sel.selectedIndex]; return o && !special(o) ? o.textContent.trim() : ''; };
    const sync = () => { if (document.activeElement !== input) input.value = curText(); };

    // sinkronkan saat kode lain mengubah .value / mengisi ulang opsi / reset form
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(sel, 'value', { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); sync(); } });
    new MutationObserver(sync).observe(sel, { childList: true, subtree: true, characterData: true });
    sel.addEventListener('change', sync);
    sel.form && sel.form.addEventListener('reset', () => setTimeout(sync, 0));

    function build(q) {
      q = norm(q);
      const all = options();
      const normal = all.filter(o => !special(o));
      let res;
      if (!q) res = normal;
      else {
        const starts = normal.filter(o => norm(o.textContent).startsWith(q));
        const words = normal.filter(o => !starts.includes(o) && norm(o.textContent).split(/[\s&/-]+/).some(w => w.startsWith(q)));
        const inc = normal.filter(o => !starts.includes(o) && !words.includes(o) && norm(o.textContent).includes(q));
        res = starts.concat(words, inc);
      }
      const extra = all.filter(o => special(o) && (!q || norm(o.textContent).includes(q)));
      items = res.concat(extra);
      const cur = sel.value;
      active = Math.max(0, items.findIndex(o => o.value === cur && q === ''));
      if (q && items.length) active = 0;
      if (!items.length) active = -1;
      list.innerHTML = items.length
        ? items.map((o, i) => `<li role="option" data-i="${i}" class="${i === active ? 'active' : ''}${special(o) ? ' special' : ''}">${o.textContent.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</li>`).join('')
        : '<li class="empty">Tidak ada kategori yang cocok</li>';
    }
    function open(q) { build(q); list.hidden = false; input.setAttribute('aria-expanded', 'true'); scrollActive(); }
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); }
    function scrollActive() { const el = list.querySelector('li.active'); if (el) el.scrollIntoView({ block: 'nearest' }); }
    function highlight(i) {
      active = i;
      list.querySelectorAll('li').forEach((li, k) => li.classList.toggle('active', k === i));
      scrollActive();
    }
    function choose(i) {
      const o = items[i];
      if (!o) return false;
      close();
      if (special(o)) {
        sel.value = o.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        input.value = curText();
        return true;
      }
      sel.value = o.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      input.value = o.textContent.trim();
      return true;
    }

    input.addEventListener('focus', () => { input.select(); open(''); });
    input.addEventListener('click', () => { if (list.hidden) open(''); });
    input.addEventListener('input', () => open(input.value));
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement === input) return;
        close();
        const q = norm(input.value);
        const exact = options().find(o => !special(o) && norm(o.textContent) === q);
        if (exact && exact.value !== sel.value) { sel.value = exact.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        input.value = curText();
      }, 120);
    });
    input.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden) { open(input.value === curText() ? '' : input.value); e.preventDefault(); e.stopPropagation(); return; }
        if (!items.length) return; // biarkan pindah kolom
        const next = active + (e.key === 'ArrowDown' ? 1 : -1);
        if (next < 0 || next >= items.length) { close(); input.value = curText(); return; } // di ujung daftar: lanjut pindah kolom
        e.preventDefault(); e.stopPropagation();
        highlight(next);
      } else if (e.key === 'Enter') {
        if (!list.hidden && active >= 0) { e.preventDefault(); const special_ = special(items[active]); choose(active); if (special_) e.stopPropagation(); }
        else if (!list.hidden) { close(); input.value = curText(); }
      } else if (e.key === 'Escape') {
        if (!list.hidden) { e.stopPropagation(); e.preventDefault(); close(); input.value = curText(); }
      } else if (e.key === 'Tab') {
        if (!list.hidden && active >= 0 && norm(input.value) && !special(items[active])) choose(active);
      }
    });
    list.addEventListener('pointerdown', e => {
      const li = e.target.closest('li[data-i]');
      if (!li) return;
      e.preventDefault();
      choose(+li.dataset.i);
    });
    list.addEventListener('click', e => e.preventDefault());
    sync();
  }
  ['#transaction-category-select', '#edit-tx-category'].forEach(s => setup(document.querySelector(s)));
})();

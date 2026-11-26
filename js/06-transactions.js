// js/06-transactions.js
// Manajemen daftar transaksi, accordion per tanggal, pencarian, filter, input modal, edit, dan navigasi keyboard

let txKindFilter = 'all';

function toggleDateCollapse(dateKey) {
  if (collapsedDates.has(dateKey)) {
    collapsedDates.delete(dateKey);
  } else {
    collapsedDates.add(dateKey);
  }
  renderRows();
}

function renderRows() {
  let rows = records.filter(r => ['income', 'expense'].includes(r.kind));

  if (txKindFilter === 'income') {
    rows = rows.filter(r => r.kind === 'income');
  } else if (txKindFilter === 'expense') {
    rows = rows.filter(r => r.kind === 'expense');
  }

  if (txSearchQuery) {
    const q = txSearchQuery.toLowerCase().trim();
    rows = rows.filter(r => (r.title && r.title.toLowerCase().includes(q)) || (r.category && r.category.toLowerCase().includes(q)) || (r.record_date && r.record_date.includes(q)));
  }

  document.querySelectorAll('.tx-filter-pill').forEach(pill => {
    pill.classList.toggle('active', (pill.dataset.txFilter || 'all') === txKindFilter);
  });

  const host = document.querySelector('#transaction-rows');
  if (!host) return;

  if (!rows.length) {
    host.innerHTML = `<div class="empty-state">${txSearchQuery ? 'Tidak ada transaksi yang cocok dengan pencarian.' : 'Belum ada transaksi. Catat gerak energi pertamamu.'}</div>`;
    return;
  }

  // Kelompokkan per tanggal
  const groupsByDate = {};
  rows.forEach(r => {
    const d = r.record_date;
    if (!groupsByDate[d]) groupsByDate[d] = [];
    groupsByDate[d].push(r);
  });
  const sortedDates = Object.keys(groupsByDate).sort((a, b) => b.localeCompare(a));

  // Pastikan urutan transaksi di hari yang sama terurut kronologis sesuai waktu input
  Object.values(groupsByDate).forEach(group => {
    group.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
  });

  host.innerHTML = sortedDates.map(dateKey => {
    const items = groupsByDate[dateKey];
    const isCollapsed = collapsedDates.has(dateKey);
    const dayIncome = items.filter(r => r.kind === 'income').reduce((s, r) => s + Number(r.amount), 0);
    const dayExpense = items.filter(r => r.kind === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    const dateFormatted = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${dateKey}T00:00:00`));

    return `
      <div class="tx-date-group" data-date="${dateKey}">
        <div class="tx-date-header" data-toggle-date="${dateKey}">
          <div class="tx-date-title">
            <button type="button" class="tx-date-toggle-btn" aria-label="Buka tutup transaksi tanggal ${dateKey}">
              ${isCollapsed ? '▶' : '▼'}
            </button>
            <span>${dateFormatted}</span>
            <small style="font-weight:400;color:#718276;">(${items.length} transaksi)</small>
          </div>
          <div class="tx-date-header-summary">
            ${dayIncome ? `<span style="color:#2f6e4a;">+${compact(dayIncome)}</span> ` : ''}
            ${dayExpense ? `<span style="color:#b24c3d;">-${compact(dayExpense)}</span>` : ''}
          </div>
        </div>
        <div class="tx-group-items" ${isCollapsed ? 'hidden' : ''}>
          ${items.map(r => `
            <div class="transaction-row">
              <div class="tx-name"><span class="tx-icon ${r.kind === 'income' ? 'income' : ''}">${r.kind === 'income' ? '↙' : '↗'}</span>${escapeHtml(r.title)}${txDetailHtml(r)}</div>
              <span class="tx-category">${escapeHtml(r.category)}</span>
              <span class="tx-date">${new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'short' }).format(new Date(`${r.record_date}T00:00:00`))}</span>
              <span class="tx-amount ${r.kind === 'income' ? 'positive' : ''}">${r.kind === 'income' ? '+' : '−'} ${rupiah(r.amount)}</span>
              <div class="tx-actions">
                <button class="text-button" data-edit-tx="${r.id}">Edit</button>
                <button class="text-button danger" data-delete-record="${r.id}">Hapus</button>
              </div>
            </div>
          `).join('')}
          <div class="tx-date-daily-footer">
            <span>Total ${items.length} transaksi pada ${dateFormatted}</span>
            <span>
              ${dayIncome > 0 ? `Masuk: <b>${rupiah(dayIncome)}</b> ` : ''}
              ${dayExpense > 0 ? `Keluar: <b>${rupiah(dayExpense)}</b>` : ''}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  host.querySelectorAll('[data-toggle-date]').forEach(el => el.addEventListener('click', () => toggleDateCollapse(el.dataset.toggleDate)));
  host.querySelectorAll('[data-edit-tx]').forEach(b => b.addEventListener('click', () => openEditTransaction(b.dataset.editTx)));
  host.querySelectorAll('[data-delete-record]').forEach(b => b.addEventListener('click', () => deleteRecord(b.dataset.deleteRecord)));
}

function openEditTransaction(id) {
  const tx = records.find(r => String(r.id) === String(id));
  if (!tx) return;
  if (tx.category) saveCustomCategory(tx.category);
  populateCategorySelects(tx.category);
  const editId = document.querySelector('#edit-tx-id');
  if (editId) editId.value = tx.id;
  const editName = document.querySelector('#edit-tx-name');
  if (editName) editName.value = tx.title;
  const editType = document.querySelector('#edit-tx-type');
  if (editType) editType.value = tx.kind;
  const editCat = document.querySelector('#edit-tx-category');
  if (editCat) editCat.value = tx.category;
  const editAmount = document.querySelector('#edit-tx-amount');
  if (editAmount) editAmount.value = Number(tx.amount) + Number(tx.discount || 0);
  const ef = document.querySelector('#edit-transaction-form');
  if (ef) {
    const set = (n, v) => { const el = ef.querySelector('[name=' + n + ']'); if (el) el.value = v == null ? '' : v; };
    set('quantity', tx.quantity); set('unit', tx.unit); set('unit_price', tx.unit_price);
    set('discount', tx.discount > 0 ? tx.discount : ''); set('discount_type', 'rp');
  }
  const editDate = document.querySelector('#edit-tx-date');
  if (editDate) editDate.value = tx.record_date;
  const editDialog = document.querySelector('#edit-transaction-dialog');
  if (editDialog) editDialog.showModal();
  if (ef) updatePricePreview(ef);
}

const editTxForm = document.querySelector('#edit-transaction-form');
if (editTxForm) {
  editTxForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const id = d.get('id');
    const pr = readPricing(e.currentTarget);
    if (!validatePricing(pr)) return;
    const previousIndex = records.findIndex(r => String(r.id) === String(id));
    const previousRecord = previousIndex !== -1 ? { ...records[previousIndex] } : null;

    if (previousIndex !== -1) {
      records[previousIndex] = {
        ...records[previousIndex],
        title: d.get('name'),
        kind: d.get('type'),
        category: d.get('category'),
        ...pricingFields(pr),
        record_date: d.get('date')
      };
      setCachedData(STORAGE_KEY_RECORDS, records);
      render();
    }

    const editDialog = document.querySelector('#edit-transaction-dialog');
    if (editDialog) editDialog.close();
    e.currentTarget.reset();

    const updates = {
      title: d.get('name'),
      kind: d.get('type'),
      category: d.get('category'),
      ...pricingFields(pr),
      record_date: d.get('date')
    };

    if (!navigator.onLine || !db) {
      addToOfflineQueue({ type: 'update_record', id, data: updates });
      showToast('Perubahan tersimpan lokal (Offline).', 'warning');
      return;
    }

    try {
      const { data, error } = await db.from('finance_records').update(updates).eq('id', id).eq('user_id', activeUser.id).select();
      if (error) throw error;
      if (data && data[0]) {
        const idx = records.findIndex(r => String(r.id) === String(id));
        if (idx !== -1) records[idx] = data[0];
        setCachedData(STORAGE_KEY_RECORDS, records);
        render();
      }
      showToast('Perubahan berhasil disimpan.', 'success');
    } catch (err) {
      addToOfflineQueue({ type: 'update_record', id, data: updates });
      showToast('Koneksi terputus. Perubahan disimpan offline.', 'warning');
    }
  });
}

async function deleteRecord(id) {
  if (!confirm('Hapus catatan ini?')) return;
  records = records.filter(r => String(r.id) !== String(id));
  setCachedData(STORAGE_KEY_RECORDS, records);
  render();

  if (!navigator.onLine || !db) {
    addToOfflineQueue({ type: 'delete_record', id });
    showToast('Catatan dihapus secara offline.', 'warning');
    return;
  }

  try {
    const { error } = await db.from('finance_records').delete().eq('id', id).eq('user_id', activeUser.id);
    if (error) throw error;
    showToast('Catatan berhasil dihapus.', 'success');
  } catch (err) {
    addToOfflineQueue({ type: 'delete_record', id });
    showToast('Catatan dihapus offline (akan disinkronkan).', 'warning');
  }
}

// ===== Volume x harga satuan, diskon =====
function readPricing(form) {
  const num = n => { const v = parseFloat(form.querySelector('[name=' + n + ']')?.value); return Number.isFinite(v) ? v : null; };
  const qty = num('quantity'), up = num('unit_price'), disc = num('discount');
  const unit = (form.querySelector('[name=unit]')?.value || '').trim().slice(0, 20);
  const auto = qty !== null && qty > 0 && up !== null && up >= 0;
  const gross = auto ? Math.round(qty * up) : (num('amount') || 0);
  let discount = 0;
  if (disc && disc > 0) {
    discount = form.querySelector('[name=discount_type]')?.value === 'pct' ? Math.round(gross * Math.min(disc, 100) / 100) : Math.round(disc);
  }
  const total = gross - discount;
  return { auto, gross, discount, total, quantity: auto || (qty && qty > 0) ? qty : null, unit: unit || null, unit_price: up };
}
function pricingFields(pr) {
  return {
    amount: pr.total,
    quantity: pr.quantity > 0 ? pr.quantity : null,
    unit: pr.unit,
    unit_price: pr.quantity > 0 && pr.unit_price !== null ? pr.unit_price : null,
    discount: pr.discount > 0 ? pr.discount : null
  };
}
function updatePricePreview(form) {
  const pr = readPricing(form);
  const amountEl = form.querySelector('[name=amount]');
  if (amountEl) {
    amountEl.readOnly = pr.auto;
    if (pr.auto) amountEl.value = pr.gross;
  }
  const box = form.querySelector('[data-price-preview]');
  if (!box) return;
  if (pr.gross <= 0) { box.hidden = true; return; }
  const q = pr.auto ? `${pr.quantity} ${pr.unit || ''} × ${rupiah(pr.unit_price)} = ${rupiah(pr.gross)}` : '';
  const dsc = pr.discount > 0 ? `${t('Diskon')}: − ${rupiah(pr.discount)}` : '';
  box.hidden = false;
  box.innerHTML = (q ? `<div class="pp-line">${escapeHtml(q)}</div>` : '') + (dsc ? `<div class="pp-line pp-disc">${escapeHtml(dsc)}</div>` : '') +
    `<div class="pp-total">${escapeHtml(t('Total'))}: <b>${rupiah(Math.max(pr.total, 0))}</b></div>`;
}
function txDetailHtml(r) {
  const parts = [];
  if (r.quantity && r.unit_price != null) parts.push(`${Number(r.quantity)} ${escapeHtml(r.unit || '')} × ${rupiah(r.unit_price)}`);
  else if (r.quantity) parts.push(`${Number(r.quantity)} ${escapeHtml(r.unit || '')}`);
  if (r.discount > 0) parts.push(`${escapeHtml(t('Diskon'))} ${rupiah(r.discount)}`);
  return parts.length ? `<small class="tx-detail">${parts.join(' · ')}</small>` : '';
}
['#transaction-form', '#edit-transaction-form'].forEach(sel => {
  const f = document.querySelector(sel);
  if (!f) return;
  ['input', 'change'].forEach(ev => f.addEventListener(ev, e => {
    if (e.target.matches('[name=quantity],[name=unit_price],[name=discount],[name=discount_type],[name=amount]')) updatePricePreview(f);
  }));
});
function validatePricing(pr) {
  if (pr.gross <= 0) { showToast('Isi jumlah atau volume dan harga satuan.', 'warning'); return false; }
  if (pr.total <= 0) { showToast('Diskon tidak boleh melebihi harga asal.', 'warning'); return false; }
  return true;
}

function resetCatatForm() {
  const form = document.querySelector('#transaction-form');
  if (form) form.reset();
  populateCategorySelects('Makan & minum');
  const dateInput = form ? form.querySelector('[name=date]') : null;
  if (dateInput) dateInput.value = today();
  const nameInput = form ? form.querySelector('[name=name]') : null;
  if (nameInput) nameInput.value = '';
  if (form) updatePricePreview(form);
}

// Form catat transaksi kini halaman tersendiri (tab "Catat"), bukan popup
function focusCatatFirstField() {
  [60, 250].forEach(ms => setTimeout(() => {
    const el = document.querySelector('#view-catat.active #transaction-form [name=name]') || document.querySelector('#transaction-form [name=name]');
    if (el && el.offsetParent !== null && !document.querySelector('dialog[open]')) el.focus({ preventScroll: true });
  }, ms));
}

function openAddTransactionDialog() {
  resetCatatForm();
  if (typeof switchTab === 'function') switchTab('catat');
  focusCatatFirstField();
}

document.querySelector('#add-transaction')?.addEventListener('click', openAddTransactionDialog);

const txForm = document.querySelector('#transaction-form');
if (txForm) {
  txForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const pr = readPricing(e.currentTarget);
    if (!validatePricing(pr)) return;
    const newRecord = {
      id: tempId,
      user_id: activeUser.id,
      title: d.get('name'),
      kind: d.get('type'),
      category: d.get('category'),
      ...pricingFields(pr),
      record_date: d.get('date'),
      settled: false,
      created_at: new Date().toISOString()
    };
    records.push(newRecord);
    setCachedData(STORAGE_KEY_RECORDS, records);
    render();

    resetCatatForm();

    if (!navigator.onLine || !db) {
      addToOfflineQueue({ type: 'insert_record', data: {
        user_id: activeUser.id,
        title: newRecord.title,
        kind: newRecord.kind,
        category: newRecord.category,
        amount: newRecord.amount,
        quantity: newRecord.quantity,
        unit: newRecord.unit,
        unit_price: newRecord.unit_price,
        discount: newRecord.discount,
        record_date: newRecord.record_date
      }, tempId });
      showToast('Transaksi tersimpan lokal (Mode Offline).', 'warning');
      return;
    }

    try {
      const { data, error } = await db.from('finance_records').insert({
        user_id: activeUser.id,
        title: newRecord.title,
        kind: newRecord.kind,
        category: newRecord.category,
        amount: newRecord.amount,
        quantity: newRecord.quantity,
        unit: newRecord.unit,
        unit_price: newRecord.unit_price,
        discount: newRecord.discount,
        record_date: newRecord.record_date
      }).select();

      if (error) throw error;
      if (data && data[0]) {
        const idx = records.findIndex(r => r.id === tempId);
        if (idx !== -1) records[idx] = data[0];
        setCachedData(STORAGE_KEY_RECORDS, records);
        render();
      }
      showToast('Transaksi berhasil disimpan.', 'success');
    } catch (err) {
      addToOfflineQueue({ type: 'insert_record', data: {
        user_id: activeUser.id,
        title: newRecord.title,
        kind: newRecord.kind,
        category: newRecord.category,
        amount: newRecord.amount,
        quantity: newRecord.quantity,
        unit: newRecord.unit,
        unit_price: newRecord.unit_price,
        discount: newRecord.discount,
        record_date: newRecord.record_date
      }, tempId });
      showToast('Koneksi terputus. Transaksi disimpan lokal dan akan disinkronkan saat online.', 'warning');
    }
  });
}

// Keyboard navigation untuk form transaksi (Up, Down, Home, End, Enter)
// - Kolom isian: ↑/↓ pindah kolom; Home/End lompat ke kolom pertama/terakhir saat kursor di awal/akhir teks
// - Pilihan (kategori/jenis/diskon): ↑/↓/Home/End memilih opsi seperti biasa; Tab/Enter untuk pindah
function setupFormKeyboardNavigation(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return;
  form.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const fields = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, button[type="submit"], .submit-button')).filter(el => !el.disabled && el.offsetParent !== null);
    const el = document.activeElement;
    const idx = fields.indexOf(el);
    if (idx === -1) return;
    const tag = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();
    const go = (i) => { e.preventDefault(); const n = fields[(i + fields.length) % fields.length]; n.focus(); if (n.select && n.tagName === 'INPUT' && !['date'].includes(n.type)) { try { n.select(); } catch (_) {} } };

    if (tag === 'select') {
      if (e.key === 'Enter') { go(idx + 1); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        // Memilih opsi (kategori/jenis); di opsi paling akhir/awal, panah lanjut ke kolom sebelah/berikutnya
        const opts = Array.from(el.options).filter(o => !o.disabled && o.value !== '__add_new__' && o.value !== '__manage_categories__');
        let i = opts.findIndex(o => o.value === el.value);
        if (e.key === 'ArrowDown' && i >= opts.length - 1) { go(idx + 1); return; }
        if (e.key === 'ArrowUp' && i <= 0) { go(idx - 1); return; }
        e.preventDefault();
        if (e.key === 'ArrowDown') i += 1; else if (e.key === 'ArrowUp') i -= 1; else if (e.key === 'Home') i = 0; else i = opts.length - 1;
        if (opts[i] && opts[i].value !== el.value) { el.value = opts[i].value; el.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      return;
    }
    if (tag === 'button') {
      if (e.key === 'ArrowDown') go(idx + 1);
      else if (e.key === 'ArrowUp') go(idx - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(fields.length - 1);
      return;
    }
    // input
    if (e.key === 'Enter') {
      if (idx >= fields.length - 1) return;
      go(idx + 1);
      return;
    }
    if (e.key === 'ArrowDown') { if (type !== 'date') go(idx + 1); else if (e.shiftKey) go(idx + 1); return; }
    if (e.key === 'ArrowUp') { if (type !== 'date') go(idx - 1); else if (e.shiftKey) go(idx - 1); return; }
    if (e.key === 'Home' || e.key === 'End') {
      if (type === 'date') return;
      let atEdge = true;
      try {
        if (type === 'text' || type === '') {
          atEdge = e.key === 'Home' ? (el.selectionStart === 0 && el.selectionEnd === 0) : (el.selectionStart === el.value.length);
        }
      } catch (_) {}
      if (atEdge) go(e.key === 'Home' ? 0 : fields.length - 1);
    }
  });
}

setupFormKeyboardNavigation('#transaction-form');
setupFormKeyboardNavigation('#edit-transaction-form');

const searchInput = document.querySelector('#tx-search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    txSearchQuery = e.target.value;
    renderRows();
  });
}

document.querySelector('#add-transaction-tx-view')?.addEventListener('click', () => {
  openAddTransactionDialog();
});

document.querySelector('#open-manage-categories-btn')?.addEventListener('click', () => {
  if (typeof openCategoryManagerDialog === 'function') openCategoryManagerDialog();
});

document.querySelectorAll('.tx-filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    txKindFilter = pill.dataset.txFilter || 'all';
    renderRows();
  });
});

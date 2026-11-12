// js/06-transactions.js
// Manajemen daftar transaksi, accordion per tanggal, pencarian, input modal, edit, dan navigasi keyboard

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
  if (txSearchQuery) {
    const q = txSearchQuery.toLowerCase().trim();
    rows = rows.filter(r => (r.title && r.title.toLowerCase().includes(q)) || (r.category && r.category.toLowerCase().includes(q)) || (r.record_date && r.record_date.includes(q)));
  }
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
    const dateFormatted = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${dateKey}T00:00:00`));

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
              <div class="tx-name"><span class="tx-icon ${r.kind === 'income' ? 'income' : ''}">${r.kind === 'income' ? '↙' : '↗'}</span>${escapeHtml(r.title)}</div>
              <span class="tx-category">${escapeHtml(r.category)}</span>
              <span class="tx-date">${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${r.record_date}T00:00:00`))}</span>
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
  if (editAmount) editAmount.value = tx.amount;
  const editDate = document.querySelector('#edit-tx-date');
  if (editDate) editDate.value = tx.record_date;
  const editDialog = document.querySelector('#edit-transaction-dialog');
  if (editDialog) editDialog.showModal();
}

const editTxForm = document.querySelector('#edit-transaction-form');
if (editTxForm) {
  editTxForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const id = d.get('id');
    const previousIndex = records.findIndex(r => String(r.id) === String(id));
    const previousRecord = previousIndex !== -1 ? { ...records[previousIndex] } : null;

    if (previousIndex !== -1) {
      records[previousIndex] = {
        ...records[previousIndex],
        title: d.get('name'),
        kind: d.get('type'),
        category: d.get('category'),
        amount: Number(d.get('amount')),
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
      amount: Number(d.get('amount')),
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

function openAddTransactionDialog() {
  const form = document.querySelector('#transaction-form');
  if (form) form.reset();
  populateCategorySelects('Makan & minum');
  const dateInput = form ? form.querySelector('[name=date]') : null;
  if (dateInput) dateInput.value = today();
  const nameInput = form ? form.querySelector('[name=name]') : null;
  if (nameInput) {
    nameInput.value = '';
    setTimeout(() => nameInput.focus(), 50);
  }
  const txDialog = document.querySelector('#transaction-dialog');
  if (txDialog) txDialog.showModal();
}

document.querySelector('#add-transaction')?.addEventListener('click', openAddTransactionDialog);

const txForm = document.querySelector('#transaction-form');
if (txForm) {
  txForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const newRecord = {
      id: tempId,
      user_id: activeUser.id,
      title: d.get('name'),
      kind: d.get('type'),
      category: d.get('category'),
      amount: Number(d.get('amount')),
      record_date: d.get('date'),
      settled: false,
      created_at: new Date().toISOString()
    };
    records.push(newRecord);
    setCachedData(STORAGE_KEY_RECORDS, records);
    render();

    const txDialog = document.querySelector('#transaction-dialog');
    if (txDialog) txDialog.close();
    e.currentTarget.reset();

    if (!navigator.onLine || !db) {
      addToOfflineQueue({ type: 'insert_record', data: {
        user_id: activeUser.id,
        title: newRecord.title,
        kind: newRecord.kind,
        category: newRecord.category,
        amount: newRecord.amount,
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
        record_date: newRecord.record_date
      }, tempId });
      showToast('Koneksi terputus. Transaksi disimpan lokal dan akan disinkronkan saat online.', 'warning');
    }
  });
}

// Keyboard navigation untuk form transaksi (Up, Down, Home, End, Enter)
function setupFormKeyboardNavigation(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return;
  form.addEventListener('keydown', (e) => {
    const focusableSelectors = 'input:not([type="hidden"]), select, button[type="submit"], .submit-button';
    const fields = Array.from(form.querySelectorAll(focusableSelectors)).filter(el => !el.disabled && el.offsetParent !== null);
    const currentIndex = fields.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % fields.length;
      fields[nextIndex].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + fields.length) % fields.length;
      fields[prevIndex].focus();
    } else if (e.key === 'Home' && !['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
      e.preventDefault();
      fields[0].focus();
    } else if (e.key === 'End' && !['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
      e.preventDefault();
      fields[fields.length - 1].focus();
    } else if (e.key === 'Enter') {
      if (document.activeElement.tagName.toLowerCase() === 'button' && document.activeElement.type === 'submit') {
        return;
      }
      if (currentIndex === fields.length - 2 || currentIndex === fields.length - 1) {
        return;
      }
      e.preventDefault();
      fields[currentIndex + 1].focus();
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

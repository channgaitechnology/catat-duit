// js/07-assets-debts.js
// Pengelolaan workspace, pencatatan & pelunasan utang-piutang, serta aset cair & tetap (dengan dukungan offline)

let currentDebtFilter = 'all';

function renderDebtsView(filter = currentDebtFilter) {
  currentDebtFilter = filter;
  const listEl = document.querySelector('#debts-view-list');
  const allDebts = records.filter(r => r.kind.startsWith('debt_'));

  const payables = allDebts.filter(r => r.kind === 'debt_payable');
  const receivables = allDebts.filter(r => r.kind === 'debt_receivable');
  const unsettledPayables = payables.filter(r => !r.settled);
  const unsettledReceivables = receivables.filter(r => !r.settled);

  const totalPayable = unsettledPayables.reduce((s, r) => s + Number(r.amount), 0);
  const totalReceivable = unsettledReceivables.reduce((s, r) => s + Number(r.amount), 0);
  const netDebt = totalReceivable - totalPayable;

  // Update summary stats
  const payVal = document.querySelector('#debts-payable-value');
  const paySub = document.querySelector('#debts-payable-sub');
  if (payVal) payVal.textContent = rupiah(totalPayable);
  if (paySub) paySub.textContent = `${unsettledPayables.length} belum lunas (dari ${payables.length} utang)`;

  const recVal = document.querySelector('#debts-receivable-value');
  const recSub = document.querySelector('#debts-receivable-sub');
  if (recVal) recVal.textContent = rupiah(totalReceivable);
  if (recSub) recSub.textContent = `${unsettledReceivables.length} belum lunas (dari ${receivables.length} piutang)`;

  const netVal = document.querySelector('#debts-net-value');
  const netSub = document.querySelector('#debts-net-sub');
  if (netVal) {
    const sign = netDebt > 0 ? '+' : '';
    netVal.textContent = `${sign}${rupiah(netDebt)}`;
    netVal.style.color = netDebt > 0 ? '#497e29' : (netDebt < 0 ? '#cb5139' : 'inherit');
  }
  if (netSub) {
    netSub.textContent = netDebt > 0 ? 'Surplus (piutang > utang)' : (netDebt < 0 ? 'Defisit kewajiban bayar' : 'Kondisi seimbang');
  }

  // Update filter pills active state
  document.querySelectorAll('.debts-filter-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.debtFilter === filter);
  });

  if (!listEl) return;

  // Apply filter
  let filtered = allDebts;
  if (filter === 'unsettled') filtered = allDebts.filter(r => !r.settled);
  else if (filter === 'settled') filtered = allDebts.filter(r => r.settled);
  else if (filter === 'payable') filtered = payables;
  else if (filter === 'receivable') filtered = receivables;

  // Sort by date descending
  filtered.sort((a, b) => (b.record_date || '').localeCompare(a.record_date || ''));

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state">Tidak ada catatan utang atau piutang ${filter !== 'all' ? 'pada filter ini' : 'tersimpan'}.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(d => {
    const isPayable = d.kind === 'debt_payable';
    const kindLabel = isPayable ? 'Utang' : 'Piutang';
    const statusText = d.settled ? 'Lunas' : 'Belum Lunas';
    const statusClass = d.settled ? 'settled' : 'unsettled';
    return `
      <div class="workspace-row">
        <span class="debt-kind" style="font-weight:600;color:${isPayable ? '#d97736' : '#5a8c43'};">${kindLabel}</span>
        <b>${escapeHtml(d.title)}</b>
        <span class="debt-badge-status ${statusClass}">[${statusText}]</span>
        <strong>${rupiah(d.amount)}</strong>
        <time>${escapeHtml(d.record_date || '')}</time>
        <div class="tx-actions">
          <button data-toggle-debt="${d.id}" data-settled="${d.settled}" class="text-button">${d.settled ? 'Tandai belum lunas' : 'Tandai lunas'}</button>
          <button data-delete-record="${d.id}" class="text-button danger">Hapus</button>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-toggle-debt]').forEach(b => b.addEventListener('click', () => toggleDebt(b.dataset.toggleDebt, b.dataset.settled === 'true')));
  listEl.querySelectorAll('[data-delete-record]').forEach(b => b.addEventListener('click', () => deleteRecord(b.dataset.deleteRecord)));
}

function renderAssetsView() {
  const liquidList = assets.filter(a => parseAssetName(a.name).isLiquid);
  const nonLiquidList = assets.filter(a => !parseAssetName(a.name).isLiquid);
  const liquidTotal = liquidList.reduce((s, a) => s + Number(a.amount), 0);
  const nonLiquidTotal = nonLiquidList.reduce((s, a) => s + Number(a.amount), 0);
  const grandTotal = liquidTotal + nonLiquidTotal;

  // Update summary stats
  const totalVal = document.querySelector('#assets-total-view-val');
  const liquidVal = document.querySelector('#assets-liquid-view-val');
  const nonLiquidVal = document.querySelector('#assets-nonliquid-view-val');
  if (totalVal) totalVal.textContent = rupiah(grandTotal);
  if (liquidVal) liquidVal.textContent = rupiah(liquidTotal);
  if (nonLiquidVal) nonLiquidVal.textContent = rupiah(nonLiquidTotal);

  const totalSub = document.querySelector('#assets-total-view-sub');
  if (totalSub) totalSub.textContent = `Cair: ${compact(liquidTotal)} · Tetap: ${compact(nonLiquidTotal)}`;

  // Render liquid list
  const liquidHost = document.querySelector('#assets-liquid-list');
  if (liquidHost) {
    liquidHost.innerHTML = liquidList.length ? liquidList.map(a => {
      const p = parseAssetName(a.name);
      return `
        <div class="workspace-row">
          <span class="debt-kind" style="font-weight:600;color:#496333;">${escapeHtml(p.category)}</span>
          <b>${escapeHtml(p.displayName)}</b>
          <span></span>
          <strong>${rupiah(a.amount)}</strong>
          <button data-delete-asset="${a.id}" class="text-button danger">Hapus</button>
        </div>
      `;
    }).join('') : '<div class="empty-state">Belum ada aset cair (cash, tabungan, deposito, emas). Catat sekarang untuk menopang Runway.</div>';

    liquidHost.querySelectorAll('[data-delete-asset]').forEach(b => b.addEventListener('click', () => deleteAsset(b.dataset.deleteAsset)));
  }

  // Render non-liquid list
  const nonLiquidHost = document.querySelector('#assets-nonliquid-list');
  if (nonLiquidHost) {
    nonLiquidHost.innerHTML = nonLiquidList.length ? nonLiquidList.map(a => {
      const p = parseAssetName(a.name);
      return `
        <div class="workspace-row">
          <span class="debt-kind" style="font-weight:600;color:#708072;">${escapeHtml(p.category)}</span>
          <b>${escapeHtml(p.displayName)}</b>
          <span></span>
          <strong>${rupiah(a.amount)}</strong>
          <button data-delete-asset="${a.id}" class="text-button danger">Hapus</button>
        </div>
      `;
    }).join('') : '<div class="empty-state">Belum ada aset tetap (kendaraan, rumah, tanah, properti) yang dicatat.</div>';

    nonLiquidHost.querySelectorAll('[data-delete-asset]').forEach(b => b.addEventListener('click', () => deleteAsset(b.dataset.deleteAsset)));
  }
}

// Fallback legacy workspace handler
function renderWorkspace(view) {
  if (view === 'assets') {
    renderAssetsView();
    if (typeof switchTab === 'function') switchTab('assets');
  } else if (view === 'debts') {
    renderDebtsView();
    if (typeof switchTab === 'function') switchTab('debts');
  } else {
    if (typeof switchTab === 'function') switchTab('transactions');
  }
}

// Event listener tombol tambah hutang/piutang dan aset dari header view
document.querySelector('#btn-add-debt-main')?.addEventListener('click', () => {
  const debtDateInput = document.querySelector('#debt-form [name=record_date]');
  if (debtDateInput) debtDateInput.value = today();
  document.querySelector('#debt-dialog')?.showModal();
});

document.querySelector('#btn-add-asset-main')?.addEventListener('click', () => {
  document.querySelector('#asset-dialog')?.showModal();
});

// Event listener filter chips pada tab utang & piutang
document.querySelectorAll('.debts-filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    renderDebtsView(pill.dataset.debtFilter);
  });
});

async function deleteAsset(id) {
  if (!confirm('Hapus aset ini?')) return;
  assets = assets.filter(a => String(a.id) !== String(id));
  setCachedData(STORAGE_KEY_ASSETS, assets);
  render();

  if (!navigator.onLine || !db) {
    addToOfflineQueue({ type: 'delete_asset', id });
    showToast('Aset dihapus secara offline.', 'warning');
    return;
  }

  try {
    const { error } = await db.from('assets').delete().eq('id', id).eq('user_id', activeUser.id);
    if (error) throw error;
    showToast('Aset berhasil dihapus.', 'success');
  } catch (err) {
    addToOfflineQueue({ type: 'delete_asset', id });
    showToast('Aset dihapus offline.', 'warning');
  }
}

async function toggleDebt(id, settled) {
  const targetIndex = records.findIndex(r => String(r.id) === String(id));
  if (targetIndex !== -1) {
    records[targetIndex] = { ...records[targetIndex], settled: !settled };
    setCachedData(STORAGE_KEY_RECORDS, records);
    render();
  }

  if (!navigator.onLine || !db) {
    addToOfflineQueue({ type: 'toggle_debt', id, settled: !settled });
    showToast('Status diperbarui secara offline.', 'warning');
    return;
  }

  try {
    const { error } = await db.from('finance_records').update({ settled: !settled }).eq('id', id).eq('user_id', activeUser.id);
    if (error) throw error;
  } catch (err) {
    addToOfflineQueue({ type: 'toggle_debt', id, settled: !settled });
    showToast('Status diperbarui secara offline.', 'warning');
  }
}

const assetCategoryType = document.querySelector('#asset-category-type');
const assetSubCategory = document.querySelector('#asset-sub-category');
if (assetCategoryType && assetSubCategory) {
  assetCategoryType.addEventListener('change', () => {
    const isLiquid = assetCategoryType.value === 'liquid';
    assetSubCategory.innerHTML = isLiquid ? `
      <option value="Cash">Uang Tunai / Cash</option>
      <option value="Tabungan Bank">Tabungan Bank</option>
      <option value="Deposito">Deposito</option>
      <option value="Emas">Emas / Logam Mulia</option>
    ` : `
      <option value="Kendaraan">Kendaraan (Mobil/Motor)</option>
      <option value="Tanah & Bangunan">Tanah / Bangunan / Properti</option>
      <option value="Saham & Bisnis">Saham / Bisnis</option>
      <option value="Barang Berharga">Barang Antik / Lainnya</option>
    `;
  });
}

const assetForm = document.querySelector('#asset-form');
if (assetForm) {
  assetForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const type = d.get('asset_type') === 'non_liquid' ? 'Tidak Cair' : 'Cair';
    const sub = d.get('asset_sub') || 'Lainnya';
    const userTitle = d.get('name').trim();
    const storedName = `[${type}: ${sub}] ${userTitle}`;
    const amount = Number(d.get('amount'));
    const tempId = 'temp-asset-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const existingIdx = assets.findIndex(a => a.name === storedName);

    if (existingIdx !== -1) {
      assets[existingIdx] = { ...assets[existingIdx], amount: amount, updated_at: new Date().toISOString() };
    } else {
      assets.push({ id: tempId, user_id: activeUser.id, name: storedName, amount: amount, updated_at: new Date().toISOString() });
    }
    setCachedData(STORAGE_KEY_ASSETS, assets);
    render();

    document.querySelector('#asset-dialog')?.close();
    e.currentTarget.reset();

    const assetPayload = { user_id: activeUser.id, name: storedName, amount: amount, updated_at: new Date().toISOString() };

    if (!navigator.onLine || !db) {
      addToOfflineQueue({ type: 'insert_asset', data: assetPayload });
      showToast('Aset tersimpan lokal (Mode Offline).', 'warning');
      return;
    }

    try {
      const { data, error } = await db.from('assets').upsert(assetPayload, { onConflict: 'user_id,name' }).select();
      if (error) throw error;
      if (data && data[0]) {
        const idx = assets.findIndex(a => a.name === storedName);
        if (idx !== -1) assets[idx] = data[0];
        setCachedData(STORAGE_KEY_ASSETS, assets);
        render();
      }
      showToast('Aset berhasil disimpan.', 'success');
    } catch (err) {
      addToOfflineQueue({ type: 'insert_asset', data: assetPayload });
      showToast('Koneksi terputus. Aset tersimpan offline.', 'warning');
    }
  });
}

const debtForm = document.querySelector('#debt-form');
if (debtForm) {
  debtForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const tempId = 'temp-debt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const newDebt = {
      id: tempId,
      user_id: activeUser.id,
      title: d.get('title'),
      kind: d.get('kind'),
      category: d.get('kind') === 'debt_payable' ? 'Utang' : 'Piutang',
      amount: Number(d.get('amount')),
      record_date: d.get('record_date'),
      settled: false,
      created_at: new Date().toISOString()
    };
    records.push(newDebt);
    setCachedData(STORAGE_KEY_RECORDS, records);
    render();

    document.querySelector('#debt-dialog')?.close();
    e.currentTarget.reset();

    const debtPayload = {
      user_id: activeUser.id,
      title: newDebt.title,
      kind: newDebt.kind,
      category: newDebt.category,
      amount: newDebt.amount,
      record_date: newDebt.record_date
    };

    if (!navigator.onLine || !db) {
      addToOfflineQueue({ type: 'insert_record', data: debtPayload, tempId });
      showToast('Catatan tersimpan lokal (Mode Offline).', 'warning');
      return;
    }

    try {
      const { data, error } = await db.from('finance_records').insert(debtPayload).select();
      if (error) throw error;
      if (data && data[0]) {
        const idx = records.findIndex(r => r.id === tempId);
        if (idx !== -1) records[idx] = data[0];
        setCachedData(STORAGE_KEY_RECORDS, records);
        render();
      }
      showToast('Catatan berhasil disimpan.', 'success');
    } catch (err) {
      addToOfflineQueue({ type: 'insert_record', data: debtPayload, tempId });
      showToast('Koneksi terputus. Catatan disimpan offline.', 'warning');
    }
  });
}

// js/07-assets-debts.js
// Pengelolaan workspace, pencatatan & pelunasan utang-piutang, serta aset cair & tetap (dengan dukungan offline)

function renderWorkspace(view) {
  if (!workspace) return;
  workspace.dataset.view = view;
  workspace.hidden = false;
  const debts = records.filter(r => r.kind.startsWith('debt_'));

  if (view === 'assets') {
    const liquidList = assets.filter(a => parseAssetName(a.name).isLiquid);
    const nonLiquidList = assets.filter(a => !parseAssetName(a.name).isLiquid);
    workspace.innerHTML = `
      <div class="panel-heading"><div><h3>Semua Aset</h3><p>Daftar aset cair (likuid) dan aset tidak cair (tetap/investasi).</p></div><button class="primary-button" id="add-asset">＋ Catat aset</button></div>
      <div style="margin-top:20px;">
        <h4 style="font-size:12px;margin:0 0 10px;color:#496333;">◈ Aset Cair (Likuid) — Menopang Runway</h4>
        <div class="workspace-list" style="margin-top:0;">${liquidList.length ? liquidList.map(a => { const p = parseAssetName(a.name); return `<div class="workspace-row"><span class="debt-kind">${escapeHtml(p.category)}</span><b>${escapeHtml(p.displayName)}</b><strong>${rupiah(a.amount)}</strong><button data-delete-asset="${a.id}" class="text-button">Hapus</button></div>`; }).join('') : '<div class="empty-state">Belum ada aset cair (cash, tabungan, emas).</div>'}</div>
      </div>
      <div style="margin-top:25px;">
        <h4 style="font-size:12px;margin:0 0 10px;color:#708072;">❖ Aset Tidak Cair (Non-Likuid) — Kekayaan Tetap</h4>
        <div class="workspace-list" style="margin-top:0;">${nonLiquidList.length ? nonLiquidList.map(a => { const p = parseAssetName(a.name); return `<div class="workspace-row"><span class="debt-kind">${escapeHtml(p.category)}</span><b>${escapeHtml(p.displayName)}</b><strong>${rupiah(a.amount)}</strong><button data-delete-asset="${a.id}" class="text-button">Hapus</button></div>`; }).join('') : '<div class="empty-state">Belum ada aset tidak cair (kendaraan, tanah, bangunan).</div>'}</div>
      </div>
    `;
  } else if (view === 'debts') {
    workspace.innerHTML = `<div class="panel-heading"><div><h3>Utang & piutang</h3><p>Catatan kewajiban dan uang yang akan diterima.</p></div><button class="primary-button" id="add-debt">＋ Catat utang/piutang</button></div><div class="workspace-list">${debts.length ? debts.map(d => `<div class="workspace-row"><span class="debt-kind">${d.kind === 'debt_payable' ? 'Utang' : 'Piutang'}</span><b>${escapeHtml(d.title)}</b><strong>${rupiah(d.amount)}</strong><button data-toggle-debt="${d.id}" data-settled="${d.settled}" class="text-button">${d.settled ? 'Tandai belum lunas' : 'Tandai lunas'}</button><button data-delete-record="${d.id}" class="text-button">Hapus</button></div>`).join('') : '<div class="empty-state">Belum ada catatan utang atau piutang.</div>'}</div>`;
  } else {
    workspace.innerHTML = `<div class="panel-heading"><div><h3>Semua transaksi</h3><p>Uang masuk dan uang keluar Anda.</p></div><button class="primary-button" id="add-workspace-transaction">＋ Catat transaksi</button></div><div class="workspace-list">${records.filter(r => ['income', 'expense'].includes(r.kind)).length ? records.filter(r => ['income', 'expense'].includes(r.kind)).map(r => `<div class="workspace-row"><span class="debt-kind">${r.kind === 'income' ? 'Masuk' : 'Keluar'}</span><b>${escapeHtml(r.title)}</b><span>${escapeHtml(r.category)}</span><strong>${rupiah(r.amount)}</strong><time>${escapeHtml(r.record_date)}</time><div class="tx-actions"><button data-edit-tx="${r.id}" class="text-button">Edit</button><button data-delete-record="${r.id}" class="text-button danger">Hapus</button></div></div>`).join('') : '<div class="empty-state">Belum ada transaksi.</div>'}</div>`;
  }

  workspace.querySelector('#add-asset')?.addEventListener('click', () => document.querySelector('#asset-dialog')?.showModal());
  workspace.querySelector('#add-debt')?.addEventListener('click', () => {
    const debtDateInput = document.querySelector('#debt-form [name=record_date]');
    if (debtDateInput) debtDateInput.value = today();
    document.querySelector('#debt-dialog')?.showModal();
  });
  workspace.querySelector('#add-workspace-transaction')?.addEventListener('click', () => document.querySelector('#add-transaction')?.click());
  workspace.querySelectorAll('[data-delete-asset]').forEach(b => b.addEventListener('click', () => deleteAsset(b.dataset.deleteAsset)));
  workspace.querySelectorAll('[data-edit-tx]').forEach(b => b.addEventListener('click', () => openEditTransaction(b.dataset.editTx)));
  workspace.querySelectorAll('[data-delete-record]').forEach(b => b.addEventListener('click', () => deleteRecord(b.dataset.deleteRecord)));
  workspace.querySelectorAll('[data-toggle-debt]').forEach(b => b.addEventListener('click', () => toggleDebt(b.dataset.toggleDebt, b.dataset.settled === 'true')));
}

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

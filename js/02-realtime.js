// js/02-realtime.js
// Pengelolaan Supabase Realtime (postgres_changes) untuk update data instan tanpa refresh

function cleanupRealtime() {
  if (realtimeChannel) {
    try {
      if (db) db.removeChannel(realtimeChannel);
    } catch (e) {
      console.warn('Gagal menghapus realtime channel:', e);
    }
    realtimeChannel = null;
  }
}

function handleRealtimeRecordChange(payload) {
  const { eventType, new: newRec, old: oldRec } = payload;
  if (eventType === 'INSERT') {
    if (!records.some(r => String(r.id) === String(newRec.id))) {
      records.push(newRec);
    } else {
      const idx = records.findIndex(r => String(r.id) === String(newRec.id));
      if (idx !== -1) records[idx] = newRec;
    }
  } else if (eventType === 'UPDATE') {
    const idx = records.findIndex(r => String(r.id) === String(newRec.id));
    if (idx !== -1) {
      records[idx] = newRec;
    } else {
      records.push(newRec);
    }
  } else if (eventType === 'DELETE') {
    const delId = oldRec?.id;
    if (delId) {
      records = records.filter(r => String(r.id) !== String(delId));
    }
  }
  render();
}

function handleRealtimeAssetChange(payload) {
  const { eventType, new: newAsset, old: oldAsset } = payload;
  if (eventType === 'INSERT') {
    if (!assets.some(a => String(a.id) === String(newAsset.id))) {
      assets.push(newAsset);
    } else {
      const idx = assets.findIndex(a => String(a.id) === String(newAsset.id));
      if (idx !== -1) assets[idx] = newAsset;
    }
  } else if (eventType === 'UPDATE') {
    const idx = assets.findIndex(a => String(a.id) === String(newAsset.id));
    if (idx !== -1) {
      assets[idx] = newAsset;
    } else {
      assets.push(newAsset);
    }
  } else if (eventType === 'DELETE') {
    const delId = oldAsset?.id;
    if (delId) {
      assets = assets.filter(a => String(a.id) !== String(delId));
    }
  }
  render();
}

function handleRealtimeCategoryChange(payload) {
  const { eventType, new: newCat, old: oldCat } = payload;
  if (eventType === 'INSERT') {
    if (newCat && newCat.name && !customCategories.includes(newCat.name)) {
      customCategories.push(newCat.name);
    }
  } else if (eventType === 'UPDATE') {
    if (oldCat && newCat && oldCat.name) {
      const idx = customCategories.indexOf(oldCat.name);
      if (idx !== -1) {
        customCategories[idx] = newCat.name;
      } else if (!customCategories.includes(newCat.name)) {
        customCategories.push(newCat.name);
      }
    }
  } else if (eventType === 'DELETE') {
    if (oldCat && oldCat.name) {
      customCategories = customCategories.filter(c => c !== oldCat.name);
    }
  }
  syncCategoriesToLocal(customCategories);
  populateCategorySelects();
  renderCategoryManagerList();
}

function setupRealtime(userId) {
  cleanupRealtime();
  if (!userId || !db) return;

  realtimeChannel = db.channel('user-realtime-' + userId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'finance_records',
        filter: 'user_id=eq.' + userId
      },
      (payload) => {
        handleRealtimeRecordChange(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'assets',
        filter: 'user_id=eq.' + userId
      },
      (payload) => {
        handleRealtimeAssetChange(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: 'user_id=eq.' + userId
      },
      (payload) => {
        handleRealtimeCategoryChange(payload);
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.warn('Realtime subscription error:', err);
      }
    });
}

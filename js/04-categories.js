// js/04-categories.js
// Pengelolaan kategori transaksi (default & custom tersinkron ke Supabase dan localStorage)

const DEFAULT_CATEGORIES = ['Makan & minum', 'Tempat tinggal', 'Transportasi', 'Gaji', 'Freelance', 'Lainnya'];

function getCustomCategories() {
  if (Array.isArray(customCategories) && customCategories.length > 0) {
    return customCategories;
  }
  try {
    const local = JSON.parse(localStorage.getItem('catatduit_custom_categories') || '[]');
    if (Array.isArray(local) && local.length > 0) {
      customCategories = local;
      return customCategories;
    }
  } catch (e) {}
  return [];
}

function syncCategoriesToLocal(categoriesList) {
  try {
    localStorage.setItem('catatduit_custom_categories', JSON.stringify(categoriesList || []));
  } catch (e) {}
}

function getStoredCategories() {
  return Array.from(new Set([...DEFAULT_CATEGORIES, ...getCustomCategories()]));
}

async function saveCustomCategory(cat) {
  if (!cat || typeof cat !== 'string') return;
  const trimmed = cat.trim();
  if (!trimmed || DEFAULT_CATEGORIES.includes(trimmed)) return trimmed;

  if (!customCategories.includes(trimmed)) {
    customCategories.push(trimmed);
    syncCategoriesToLocal(customCategories);
    populateCategorySelects(trimmed);
  }

  if (activeUser && db) {
    try {
      await db.from('categories').insert({
        user_id: activeUser.id,
        name: trimmed
      });
    } catch (e) {
      console.warn('Gagal menyimpan kategori ke server:', e);
    }
  }

  return trimmed;
}

async function updateCustomCategory(oldName, newName) {
  if (!oldName || !newName) return false;
  const trimmedNew = newName.trim();
  if (!trimmedNew || oldName === trimmedNew) return false;

  // Jika nama baru sama dengan default category
  if (DEFAULT_CATEGORIES.includes(trimmedNew)) {
    alert('Nama kategori tersebut sudah ada dalam kategori bawaan.');
    return false;
  }

  // Update in memory & local storage
  const idx = customCategories.indexOf(oldName);
  if (idx !== -1) {
    customCategories[idx] = trimmedNew;
  } else {
    customCategories.push(trimmedNew);
  }
  syncCategoriesToLocal(customCategories);

  // Update in-memory transactions that used oldName
  let affectedRecords = 0;
  records.forEach(r => {
    if (r.category === oldName) {
      r.category = trimmedNew;
      affectedRecords++;
    }
  });

  populateCategorySelects();
  renderCategoryManagerList();
  render();

  // Update database (categories table and finance_records table)
  if (activeUser && db) {
    try {
      const [catRes, recRes] = await Promise.all([
        db.from('categories')
          .update({ name: trimmedNew })
          .eq('name', oldName)
          .eq('user_id', activeUser.id),
        db.from('finance_records')
          .update({ category: trimmedNew })
          .eq('category', oldName)
          .eq('user_id', activeUser.id)
      ]);

      if (catRes.error) {
        console.error('Error updating category in Supabase:', catRes.error);
      }
      if (recRes.error) {
        console.error('Error updating finance_records in Supabase:', recRes.error);
      }
    } catch (e) {
      console.error('Gagal memperbarui kategori di database:', e);
    }
  }

  return true;
}

async function deleteCustomCategory(cat) {
  customCategories = customCategories.filter(c => c !== cat);
  syncCategoriesToLocal(customCategories);
  populateCategorySelects('Makan & minum');
  renderCategoryManagerList();
  render();

  if (activeUser && db) {
    try {
      await db.from('categories')
        .delete()
        .eq('name', cat)
        .eq('user_id', activeUser.id);
    } catch (e) {
      console.warn('Gagal menghapus kategori dari server:', e);
    }
  }
}

function populateCategorySelects(selectedCategory) {
  const cats = getStoredCategories();
  const selects = [document.querySelector('#transaction-category-select'), document.querySelector('#edit-tx-category')].filter(Boolean);
  selects.forEach(sel => {
    const currentVal = selectedCategory || sel.value;
    let optionsHtml = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('') +
      '<option value="__add_new__">＋ Tambah kategori baru...</option>' +
      '<option value="__manage_categories__">✏️ Edit / kelola kategori...</option>';
    sel.innerHTML = optionsHtml;
    if (currentVal && cats.includes(currentVal)) {
      sel.value = currentVal;
    }
  });
}

function renderCategoryManagerList() {
  const listEl = document.querySelector('#manage-categories-list');
  if (!listEl) return;
  const custom = getCustomCategories();

  if (!custom.length) {
    listEl.innerHTML = '<div class="empty-state" style="padding:15px;">Belum ada kategori tambahan kustom. Klik tombol di bawah untuk menambah kategori.</div>';
    return;
  }

  listEl.innerHTML = custom.map(cat => `
    <div class="category-manage-item" data-category="${escapeHtml(cat)}">
      <div class="cat-name-view">
        <span class="cat-tag">🏷</span>
        <strong class="cat-title">${escapeHtml(cat)}</strong>
      </div>
      <div class="cat-actions">
        <button type="button" class="secondary-button cat-edit-btn" data-edit-category="${escapeHtml(cat)}">
          ✏️ Edit
        </button>
        <button type="button" class="text-button danger cat-delete-btn" data-delete-category="${escapeHtml(cat)}">
          🗑 Hapus
        </button>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('[data-edit-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.editCategory;
      startEditCategory(cat, btn.closest('.category-manage-item'));
    });
  });

  listEl.querySelectorAll('[data-delete-category]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = btn.dataset.deleteCategory;
      if (confirm(`Hapus kategori "${cat}"? Transaksi yang memakai kategori ini tidak akan terhapus, namun tidak akan ada lagi di daftar pilihan.`)) {
        await deleteCustomCategory(cat);
      }
    });
  });
}

function startEditCategory(oldName, rowEl) {
  if (!rowEl) return;
  rowEl.innerHTML = `
    <form class="cat-edit-form" style="display:flex;width:100%;gap:8px;align-items:center;">
      <input type="text" class="cat-edit-input" value="${escapeHtml(oldName)}" required maxlength="60" style="flex:1;height:36px;border:1px solid #9bb87c;border-radius:6px;padding:0 8px;font-size:12px;" />
      <button type="submit" class="primary-button" style="padding:6px 12px;font-size:11px;">Simpan</button>
      <button type="button" class="secondary-button cat-cancel-edit" style="padding:6px 10px;font-size:11px;">Batal</button>
    </form>
  `;
  const input = rowEl.querySelector('.cat-edit-input');
  if (input) {
    input.focus();
    input.select();
  }

  rowEl.querySelector('.cat-cancel-edit')?.addEventListener('click', () => {
    renderCategoryManagerList();
  });

  rowEl.querySelector('.cat-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = input.value.trim();
    if (!newName) return;
    await updateCustomCategory(oldName, newName);
  });
}

function openCategoryManagerDialog() {
  renderCategoryManagerList();
  const dialog = document.querySelector('#manage-categories-dialog');
  if (dialog) {
    dialog.showModal();
  }
}

async function handleCategoryChange(selectEl) {
  if (selectEl.value === '__add_new__') {
    const newCat = prompt('Masukkan nama kategori pengeluaran/pemasukan baru:');
    if (newCat && newCat.trim()) {
      const added = await saveCustomCategory(newCat);
      populateCategorySelects(added);
      selectEl.value = added;
    } else {
      selectEl.value = 'Makan & minum';
    }
  } else if (selectEl.value === '__manage_categories__') {
    openCategoryManagerDialog();
    selectEl.value = 'Makan & minum';
  }
}

document.querySelectorAll('#transaction-category-select, #edit-tx-category').forEach(sel => {
  sel.addEventListener('change', () => handleCategoryChange(sel));
});

// Setup tombol tambah kategori di dalam modal kelola kategori
document.querySelector('#btn-add-category-in-manager')?.addEventListener('click', async () => {
  const newCat = prompt('Masukkan nama kategori baru:');
  if (newCat && newCat.trim()) {
    await saveCustomCategory(newCat);
    renderCategoryManagerList();
  }
});

populateCategorySelects();

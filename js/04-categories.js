// js/04-categories.js
// Pengelolaan kategori transaksi (default & custom via localStorage)

const DEFAULT_CATEGORIES = ['Makan & minum', 'Tempat tinggal', 'Transportasi', 'Gaji', 'Freelance', 'Lainnya'];

function getCustomCategories() {
  try {
    return JSON.parse(localStorage.getItem('catatduit_custom_categories') || '[]');
  } catch (e) {
    return [];
  }
}

function getStoredCategories() {
  return Array.from(new Set([...DEFAULT_CATEGORIES, ...getCustomCategories()]));
}

function saveCustomCategory(cat) {
  if (!cat || typeof cat !== 'string') return;
  const trimmed = cat.trim();
  if (!trimmed || DEFAULT_CATEGORIES.includes(trimmed)) return trimmed;
  try {
    const custom = getCustomCategories();
    if (!custom.includes(trimmed)) {
      custom.push(trimmed);
      localStorage.setItem('catatduit_custom_categories', JSON.stringify(custom));
    }
  } catch (e) {}
  return trimmed;
}

function deleteCustomCategory(cat) {
  try {
    let custom = getCustomCategories();
    custom = custom.filter(c => c !== cat);
    localStorage.setItem('catatduit_custom_categories', JSON.stringify(custom));
  } catch (e) {}
}

function populateCategorySelects(selectedCategory) {
  const cats = getStoredCategories();
  const custom = getCustomCategories();
  const selects = [document.querySelector('#transaction-category-select'), document.querySelector('#edit-tx-category')].filter(Boolean);
  selects.forEach(sel => {
    const currentVal = selectedCategory || sel.value;
    let optionsHtml = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('') +
      '<option value="__add_new__">＋ Tambah kategori baru...</option>';
    if (custom.length > 0) {
      optionsHtml += '<option value="__manage_categories__">🗑 Hapus / kelola kategori tambahan...</option>';
    }
    sel.innerHTML = optionsHtml;
    if (currentVal && cats.includes(currentVal)) {
      sel.value = currentVal;
    }
  });
}

function handleCategoryChange(selectEl) {
  if (selectEl.value === '__add_new__') {
    const newCat = prompt('Masukkan nama kategori pengeluaran/pemasukan baru:');
    if (newCat && newCat.trim()) {
      const added = saveCustomCategory(newCat);
      populateCategorySelects(added);
      selectEl.value = added;
    } else {
      selectEl.value = 'Makan & minum';
    }
  } else if (selectEl.value === '__manage_categories__') {
    const custom = getCustomCategories();
    if (!custom.length) {
      alert('Belum ada kategori custom yang bisa dihapus.');
      selectEl.value = 'Makan & minum';
      return;
    }
    const catList = custom.map((c, i) => `${i + 1}. ${c}`).join('\n');
    const input = prompt(`Pilih nomor kategori yang ingin dihapus:\n${catList}\n\nMasukkan nomor (1-${custom.length}):`);
    if (input) {
      const idx = parseInt(input.trim(), 10) - 1;
      if (idx >= 0 && idx < custom.length) {
        const toDelete = custom[idx];
        if (confirm(`Hapus kategori "${toDelete}" dari daftar pilihan?`)) {
          deleteCustomCategory(toDelete);
          populateCategorySelects('Makan & minum');
          selectEl.value = 'Makan & minum';
        } else {
          selectEl.value = 'Makan & minum';
        }
      } else {
        alert('Nomor kategori tidak valid.');
        selectEl.value = 'Makan & minum';
      }
    } else {
      selectEl.value = 'Makan & minum';
    }
  }
}

document.querySelectorAll('#transaction-category-select, #edit-tx-category').forEach(sel => {
  sel.addEventListener('change', () => handleCategoryChange(sel));
});

populateCategorySelects();

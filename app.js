const SUPABASE_URL='https://boygncniytuhcacnshcd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_-dOn_dVEEZDTvQjvM0Lgcw_9W3pWe0a';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let activeUser=null;
let records=[];
let assets=[];
let authMode='signin';
let authBusy=false;
let txSearchQuery='';
const authView=document.querySelector('#auth-view');
const appShell=document.querySelector('#app-shell');
const authForm=document.querySelector('#auth-form');
const authEmail=document.querySelector('#auth-email');
const authPassword=document.querySelector('#auth-password');
const authConfirm=document.querySelector('#auth-confirm-password');
const togglePassword=document.querySelector('#toggle-password');
const toggleConfirmPassword=document.querySelector('#toggle-confirm-password');
const workspace=document.querySelector('#finance-workspace');

function setupPasswordToggle(button,input){
  if(!button||!input)return;
  button.addEventListener('click',()=>{
    const isPassword=input.type==='password';
    input.type=isPassword?'text':'password';
    button.textContent=isPassword?'Sembunyi':'Lihat';
    button.setAttribute('aria-label',`${isPassword?'Sembunyikan':'Tampilkan'} ${button.id==='toggle-confirm-password'?'ulangi kata sandi':'kata sandi'}`);
  });
}
function resetPasswordVisibility(){
  if(authPassword){authPassword.type='password';if(togglePassword)togglePassword.textContent='Lihat'}
  if(authConfirm){authConfirm.type='password';if(toggleConfirmPassword)toggleConfirmPassword.textContent='Lihat'}
}
setupPasswordToggle(togglePassword,authPassword);
setupPasswordToggle(toggleConfirmPassword,authConfirm);

function parseAssetName(fullName){
  const match=String(fullName||'').match(/^\[(.*?)\]\s*(.*)$/);
  if(match){
    const tag=match[1],rawName=match[2];
    const isNonLiquid=tag.startsWith('Tidak Cair')||['Tanah','Bangunan','Properti','Kendaraan','Saham / Bisnis','Lainnya'].some(k=>tag.includes(k));
    return {isLiquid:!isNonLiquid,category:tag,displayName:rawName||fullName};
  }
  // Default legacy without prefix is treated as liquid
  return {isLiquid:true,category:'Aset Cair',displayName:fullName};
}

function rupiah(value){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0)}
function compact(value){return Number(value)>=1e6?`Rp ${(value/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})} jt`:rupiah(value)}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function today(){return new Date().toISOString().slice(0,10)}
function monthKey(date){return String(date).slice(0,7)}
function setAuthMessage(message='',type=''){const el=document.querySelector('#auth-message');el.textContent=message;el.className=`auth-message${type?` ${type}`:''}`}
function setAuthMode(mode){
  resetPasswordVisibility();
  authMode=mode;const signup=mode==='signup',forgot=mode==='forgot',reset=mode==='reset';
  document.querySelector('#auth-title').textContent=signup?'Buat akun Catat Duit':forgot?'Reset kata sandi':reset?'Buat kata sandi baru':'Masuk ke Catat Duit';
  document.querySelector('#auth-description').textContent=reset?'Masukkan kata sandi baru untuk akun Anda.':'Gunakan akun Catat Duit Anda.';
  document.querySelector('#auth-submit').textContent=signup?'Daftar':forgot?'Kirim tautan reset':reset?'Simpan kata sandi':'Masuk';
  document.querySelector('#auth-password-label').hidden=forgot;authPassword.disabled=forgot;authPassword.required=!forgot;
  authPassword.autocomplete=signup||reset?'new-password':'current-password';
  document.querySelector('#auth-confirm-label').hidden=!(signup||reset);authConfirm.disabled=!(signup||reset);authConfirm.required=signup||reset;
  document.querySelector('#auth-mode-toggle').hidden=forgot||reset;document.querySelector('#auth-forgot').hidden=mode!=='signin';
  const backToLogin=document.querySelector('#auth-back-to-login');if(backToLogin)backToLogin.hidden=!(forgot||reset);
  document.querySelector('#auth-mode-toggle').textContent=signup?'Sudah punya akun? Masuk':'Belum punya akun? Daftar';setAuthMessage();
}
function showLogin(){activeUser=null;appShell.hidden=true;authView.hidden=false;setAuthMode('signin')}
function translateAuthError(e){const m=e?.message||'Terjadi kesalahan. Coba lagi.';if(/invalid login credentials/i.test(m))return'Email atau kata sandi tidak cocok.';if(/email not confirmed/i.test(m))return'Konfirmasi email Anda sebelum masuk.';if(/already registered|already exists/i.test(m))return'Email sudah terdaftar. Silakan masuk.';if(/password should be at least/i.test(m))return'Kata sandi minimal 6 karakter.';if(/rate limit/i.test(m))return'Terlalu banyak percobaan. Coba lagi beberapa saat.';if(/redirect.*not allowed|redirect url/i.test(m))return'Alamat aplikasi belum terdaftar sebagai URL pengalihan Supabase.';return m}
async function submitAuth(event){
  event.preventDefault();if(authBusy)return;authBusy=true;document.querySelector('#auth-submit').disabled=true;setAuthMessage('Memproses…');
  const email=authEmail.value.trim(),password=authPassword.value,redirectTo=location.origin+location.pathname;
  try{
    if(authMode==='signin'){const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error}
    if(authMode==='signup'){if(password!==authConfirm.value)throw Error('Ulangan kata sandi tidak cocok.');const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});if(error)throw error;if(data.user&&!data.session)setAuthMessage('Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.','success')}
    if(authMode==='forgot'){const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;setAuthMessage('Jika email terdaftar, tautan reset kata sandi akan dikirim.','success')}
    if(authMode==='reset'){if(password!==authConfirm.value)throw Error('Ulangan kata sandi tidak cocok.');const {error}=await db.auth.updateUser({password});if(error)throw error;setAuthMessage('Kata sandi berhasil diperbarui.','success');setTimeout(()=>showLogin(),1300)}
  }catch(e){setAuthMessage(translateAuthError(e),'error')}finally{authBusy=false;document.querySelector('#auth-submit').disabled=false}
}
authForm.addEventListener('submit',submitAuth);
document.querySelector('#auth-mode-toggle').addEventListener('click',()=>setAuthMode(authMode==='signup'?'signin':'signup'));
document.querySelector('#auth-forgot').addEventListener('click',()=>setAuthMode('forgot'));
document.querySelector('#auth-back-to-login')?.addEventListener('click',()=>setAuthMode('signin'));

async function showApp(user){
  activeUser=user;authView.hidden=true;appShell.hidden=false;
  const email=user.email||'Akun Catat Duit';document.querySelector('#profile-email').textContent=email;
  document.querySelector('#profile-avatar').textContent=(email[0]||'C').toUpperCase();document.querySelector('#profile-avatar-small').textContent=(email[0]||'C').toUpperCase();
  document.querySelector('#welcome-title').innerHTML=`Halo, ${escapeHtml(email.split('@')[0])} <span class="wave">✳</span>`;
  await refreshData();
}
async function refreshData(){
  if(!activeUser)return;
  const [r,a]=await Promise.all([
    db.from('finance_records').select('*').eq('user_id',activeUser.id).order('record_date',{ascending:false}).order('created_at',{ascending:true}),
    db.from('assets').select('*').eq('user_id',activeUser.id).order('name')
  ]);
  if(r.error||a.error){console.error(r.error||a.error);alert('Data belum dapat dimuat. Periksa koneksi lalu muat ulang halaman.');return}
  records=r.data||[];assets=a.data||[];render();
}
db.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){appShell.hidden=true;authView.hidden=false;setAuthMode('reset');setAuthMessage('Masukkan kata sandi baru untuk akun Anda.');return}
  if(session)showApp(session.user);else showLogin();
});
async function handleLogout(){const {error}=await db.auth.signOut();if(error)setAuthMessage(translateAuthError(error),'error')}
document.querySelector('#auth-logout').addEventListener('click',handleLogout);
document.querySelector('#auth-logout-top')?.addEventListener('click',handleLogout);

function render(){
  const key=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit'}).format(new Date());
  const current=records.filter(r=>monthKey(r.record_date)===key);
  const income=current.filter(r=>r.kind==='income').reduce((s,r)=>s+Number(r.amount),0);
  const expense=current.filter(r=>r.kind==='expense').reduce((s,r)=>s+Number(r.amount),0);
  const expenseByMonth={};records.filter(r=>r.kind==='expense').forEach(r=>expenseByMonth[monthKey(r.record_date)]=(expenseByMonth[monthKey(r.record_date)]||0)+Number(r.amount));
  const lastMonths=Object.keys(expenseByMonth).sort().slice(-3);const monthlyCost=lastMonths.length?lastMonths.reduce((s,k)=>s+expenseByMonth[k],0)/lastMonths.length:0;
  const liquidAssets=assets.filter(a=>parseAssetName(a.name).isLiquid).reduce((s,a)=>s+Number(a.amount),0);
  const nonLiquidAssets=assets.filter(a=>!parseAssetName(a.name).isLiquid).reduce((s,a)=>s+Number(a.amount),0);
  const totalAssets=liquidAssets+nonLiquidAssets;
  const runway=monthlyCost?liquidAssets/monthlyCost:0;
  document.querySelector('#income-value').textContent=rupiah(income);document.querySelector('#expense-value').textContent=rupiah(expense);
  document.querySelector('#assets-value').innerHTML=`${rupiah(totalAssets)}<div style="font-size:9px;color:#859288;font-weight:400;margin-top:4px;">Cair: ${compact(liquidAssets)} · Tetap: ${compact(nonLiquidAssets)}</div>`;
  document.querySelector('#runway-months').textContent=runway.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1});document.querySelector('#runway-days').textContent=`${Math.round(runway*30)} hari`;
  document.querySelector('#available-label').textContent=compact(liquidAssets);document.querySelector('#cost-label').textContent=compact(monthlyCost);
  document.querySelector('.runway-help span').textContent=monthlyCost?'Perkiraan dari aset cair (likuid) yang Anda catat dan rata-rata pengeluaran hingga 3 bulan terakhir.':'Catat pengeluaran selama beberapa bulan untuk melihat perkiraan kemampuan bertahan.';
  const spendingTotalEl = document.querySelector('#spending-total-amount');
  if (spendingTotalEl) spendingTotalEl.textContent = rupiah(expense);
  renderSpendingBarChart(expense);
  renderRows();
  if(!workspace.hidden)renderWorkspace(workspace.dataset.view||'transactions');
}

function renderSpendingBarChart(totalExpense) {
  const chartHost = document.querySelector('#horizontal-bar-chart');
  if (!chartHost) return;

  const currentKey = monthKey(today());
  const byCategory = {};
  records.filter(r => r.kind === 'expense' && monthKey(r.record_date) === currentKey)
    .forEach(r => byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amount));

  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (!sortedCategories.length || totalExpense <= 0) {
    chartHost.innerHTML = '<div class="empty-state">Belum ada pengeluaran yang dicatat bulan ini.</div>';
    return;
  }

  const barColors = ['#5a8c43', '#d97736', '#4a7bb0', '#c2537a', '#79589f', '#c9a13b', '#628e82'];
  chartHost.innerHTML = sortedCategories.map(([catName, amount], index) => {
    const percentage = ((amount / totalExpense) * 100).toFixed(1);
    const color = barColors[index % barColors.length];
    return `
      <div class="h-bar-item">
        <div class="h-bar-top">
          <span style="font-weight: 500; color: #27382f;">${escapeHtml(catName)}</span>
          <b style="font-family: var(--mono); color: #27382f;">${rupiah(amount)}</b>
        </div>
        <div class="h-bar-track">
          <div class="h-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
        </div>
        <div class="h-bar-bottom">
          <span class="h-bar-label">${escapeHtml(catName)}</span>
          <span class="h-bar-percentage">${percentage}% dari total pengeluaran</span>
        </div>
      </div>
    `;
  }).join('');
}

const collapsedDates = new Set();
function toggleDateCollapse(dateKey) {
  if (collapsedDates.has(dateKey)) {
    collapsedDates.delete(dateKey);
  } else {
    collapsedDates.add(dateKey);
  }
  renderRows();
}

function renderRows(){
  let rows=records.filter(r=>['income','expense'].includes(r.kind));
  if (txSearchQuery) {
    const q = txSearchQuery.toLowerCase().trim();
    rows = rows.filter(r => (r.title && r.title.toLowerCase().includes(q)) || (r.category && r.category.toLowerCase().includes(q)) || (r.record_date && r.record_date.includes(q)));
  }
  const host=document.querySelector('#transaction-rows');
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
  const sortedDates = Object.keys(groupsByDate).sort((a,b) => b.localeCompare(a));

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
              <div class="tx-name"><span class="tx-icon ${r.kind==='income'?'income':''}">${r.kind==='income'?'↙':'↗'}</span>${escapeHtml(r.title)}</div>
              <span class="tx-category">${escapeHtml(r.category)}</span>
              <span class="tx-date">${new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(new Date(`${r.record_date}T00:00:00`))}</span>
              <span class="tx-amount ${r.kind==='income'?'positive':''}">${r.kind==='income'?'+':'−'} ${rupiah(r.amount)}</span>
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
  host.querySelectorAll('[data-edit-tx]').forEach(b=>b.addEventListener('click',()=>openEditTransaction(b.dataset.editTx)));
  host.querySelectorAll('[data-delete-record]').forEach(b=>b.addEventListener('click',()=>deleteRecord(b.dataset.deleteRecord)));
}
function renderWorkspace(view){
  workspace.dataset.view=view;workspace.hidden=false;const debts=records.filter(r=>r.kind.startsWith('debt_'));
  if(view==='assets'){
    const liquidList=assets.filter(a=>parseAssetName(a.name).isLiquid);
    const nonLiquidList=assets.filter(a=>!parseAssetName(a.name).isLiquid);
    workspace.innerHTML=`
      <div class="panel-heading"><div><h3>Semua Aset</h3><p>Daftar aset cair (likuid) dan aset tidak cair (tetap/investasi).</p></div><button class="primary-button" id="add-asset">＋ Catat aset</button></div>
      <div style="margin-top:20px;">
        <h4 style="font-size:12px;margin:0 0 10px;color:#496333;">◈ Aset Cair (Likuid) — Menopang Runway</h4>
        <div class="workspace-list" style="margin-top:0;">${liquidList.length?liquidList.map(a=>{const p=parseAssetName(a.name);return `<div class="workspace-row"><span class="debt-kind">${escapeHtml(p.category)}</span><b>${escapeHtml(p.displayName)}</b><strong>${rupiah(a.amount)}</strong><button data-delete-asset="${a.id}" class="text-button">Hapus</button></div>`}).join(''):'<div class="empty-state">Belum ada aset cair (cash, tabungan, emas).</div>'}</div>
      </div>
      <div style="margin-top:25px;">
        <h4 style="font-size:12px;margin:0 0 10px;color:#708072;">❖ Aset Tidak Cair (Non-Likuid) — Kekayaan Tetap</h4>
        <div class="workspace-list" style="margin-top:0;">${nonLiquidList.length?nonLiquidList.map(a=>{const p=parseAssetName(a.name);return `<div class="workspace-row"><span class="debt-kind">${escapeHtml(p.category)}</span><b>${escapeHtml(p.displayName)}</b><strong>${rupiah(a.amount)}</strong><button data-delete-asset="${a.id}" class="text-button">Hapus</button></div>`}).join(''):'<div class="empty-state">Belum ada aset tidak cair (kendaraan, tanah, bangunan).</div>'}</div>
      </div>
    `;
  }
  else if(view==='debts')workspace.innerHTML=`<div class="panel-heading"><div><h3>Utang & piutang</h3><p>Catatan kewajiban dan uang yang akan diterima.</p></div><button class="primary-button" id="add-debt">＋ Catat utang/piutang</button></div><div class="workspace-list">${debts.length?debts.map(d=>`<div class="workspace-row"><span class="debt-kind">${d.kind==='debt_payable'?'Utang':'Piutang'}</span><b>${escapeHtml(d.title)}</b><strong>${rupiah(d.amount)}</strong><button data-toggle-debt="${d.id}" data-settled="${d.settled}" class="text-button">${d.settled?'Tandai belum lunas':'Tandai lunas'}</button><button data-delete-record="${d.id}" class="text-button">Hapus</button></div>`).join(''):'<div class="empty-state">Belum ada catatan utang atau piutang.</div>'}</div>`;
  else workspace.innerHTML=`<div class="panel-heading"><div><h3>Semua transaksi</h3><p>Uang masuk dan uang keluar Anda.</p></div><button class="primary-button" id="add-workspace-transaction">＋ Catat transaksi</button></div><div class="workspace-list">${records.filter(r=>['income','expense'].includes(r.kind)).length?records.filter(r=>['income','expense'].includes(r.kind)).map(r=>`<div class="workspace-row"><span class="debt-kind">${r.kind==='income'?'Masuk':'Keluar'}</span><b>${escapeHtml(r.title)}</b><span>${escapeHtml(r.category)}</span><strong>${rupiah(r.amount)}</strong><time>${escapeHtml(r.record_date)}</time><div class="tx-actions"><button data-edit-tx="${r.id}" class="text-button">Edit</button><button data-delete-record="${r.id}" class="text-button danger">Hapus</button></div></div>`).join(''):'<div class="empty-state">Belum ada transaksi.</div>'}</div>`;
  workspace.querySelector('#add-asset')?.addEventListener('click',()=>document.querySelector('#asset-dialog').showModal());
  workspace.querySelector('#add-debt')?.addEventListener('click',()=>{document.querySelector('[name=record_date]').value=today();document.querySelector('#debt-dialog').showModal()});
  workspace.querySelector('#add-workspace-transaction')?.addEventListener('click',()=>document.querySelector('#add-transaction').click());
  workspace.querySelectorAll('[data-delete-asset]').forEach(b=>b.addEventListener('click',()=>deleteAsset(b.dataset.deleteAsset)));
  workspace.querySelectorAll('[data-edit-tx]').forEach(b=>b.addEventListener('click',()=>openEditTransaction(b.dataset.editTx)));
  workspace.querySelectorAll('[data-delete-record]').forEach(b=>b.addEventListener('click',()=>deleteRecord(b.dataset.deleteRecord)));
  workspace.querySelectorAll('[data-toggle-debt]').forEach(b=>b.addEventListener('click',()=>toggleDebt(b.dataset.toggleDebt,b.dataset.settled==='true')));
}
function openEditTransaction(id){
  const tx=records.find(r=>String(r.id)===String(id));
  if(!tx)return;
  if (tx.category) saveCustomCategory(tx.category);
  populateCategorySelects(tx.category);
  document.querySelector('#edit-tx-id').value=tx.id;
  document.querySelector('#edit-tx-name').value=tx.title;
  document.querySelector('#edit-tx-type').value=tx.kind;
  document.querySelector('#edit-tx-category').value=tx.category;
  document.querySelector('#edit-tx-amount').value=tx.amount;
  document.querySelector('#edit-tx-date').value=tx.record_date;
  document.querySelector('#edit-transaction-dialog').showModal();
}

document.querySelector('#edit-transaction-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const d=new FormData(e.currentTarget);
  const id=d.get('id');
  const {error}=await db.from('finance_records').update({
    title:d.get('name'),
    kind:d.get('type'),
    category:d.get('category'),
    amount:Number(d.get('amount')),
    record_date:d.get('date')
  }).eq('id',id).eq('user_id',activeUser.id);
  if(error){alert(error.message);return}
  document.querySelector('#edit-transaction-dialog').close();
  e.currentTarget.reset();
  await refreshData();
});

async function deleteRecord(id){if(!confirm('Hapus catatan ini?'))return;const {error}=await db.from('finance_records').delete().eq('id',id).eq('user_id',activeUser.id);if(error)return alert(error.message);await refreshData()}
async function deleteAsset(id){if(!confirm('Hapus aset ini?'))return;const {error}=await db.from('assets').delete().eq('id',id).eq('user_id',activeUser.id);if(error)return alert(error.message);await refreshData()}
async function toggleDebt(id,settled){const {error}=await db.from('finance_records').update({settled:!settled}).eq('id',id).eq('user_id',activeUser.id);if(error)return alert(error.message);await refreshData()}

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

// Keyboard navigation untuk form transaksi (Up, Down, Home, End, Enter)
function setupFormKeyboardNavigation(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return;
  form.addEventListener('keydown', (e) => {
    // Abaikan jika user sedang di select dropdown yang terbuka dengan navigasi bawaan browser saat Alt/buka
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
      // Jika di tombol submit, biarkan form submit berjalan secara alami
      if (document.activeElement.tagName.toLowerCase() === 'button' && document.activeElement.type === 'submit') {
        return;
      }
      // Jika di input terakhir sebelum submit atau tombol submit, submit form
      if (currentIndex === fields.length - 2 || currentIndex === fields.length - 1) {
        // Tombol submit atau field terakhir: trigger submit
        return;
      }
      // Jika di kolom perantara: jadikan Enter sebagai OK dan pindah ke kolom berikutnya
      e.preventDefault();
      fields[currentIndex + 1].focus();
    }
  });
}
setupFormKeyboardNavigation('#transaction-form');
setupFormKeyboardNavigation('#edit-transaction-form');

// Event listener tombol close pada semua modal dialog agar tidak memicu validasi form
document.querySelectorAll('.close-button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const dialog = btn.closest('dialog');
    if (dialog) {
      dialog.close();
      const form = dialog.querySelector('form');
      if (form) form.reset();
    }
  });
});

const searchInput = document.querySelector('#tx-search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    txSearchQuery = e.target.value;
    renderRows();
  });
}

document.querySelector('#today').textContent=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
function openAddTransactionDialog(){
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
  document.querySelector('#transaction-dialog').showModal();
}

document.querySelector('#add-transaction').addEventListener('click', openAddTransactionDialog);
document.querySelector('#transaction-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const d=new FormData(e.currentTarget);
  const {error}=await db.from('finance_records').insert({
    user_id:activeUser.id,
    title:d.get('name'),
    kind:d.get('type'),
    category:d.get('category'),
    amount:Number(d.get('amount')),
    record_date:d.get('date')
  });
  if(error){alert(error.message);return}
  document.querySelector('#transaction-dialog').close();
  e.currentTarget.reset();
  await refreshData();
});
const assetCategoryType=document.querySelector('#asset-category-type');
const assetSubCategory=document.querySelector('#asset-sub-category');
if(assetCategoryType&&assetSubCategory){
  assetCategoryType.addEventListener('change',()=>{
    const isLiquid=assetCategoryType.value==='liquid';
    assetSubCategory.innerHTML=isLiquid?`
      <option value="Cash">Uang Tunai / Cash</option>
      <option value="Tabungan Bank">Tabungan Bank</option>
      <option value="Deposito">Deposito</option>
      <option value="Emas">Emas / Logam Mulia</option>
    `:`
      <option value="Kendaraan">Kendaraan (Mobil/Motor)</option>
      <option value="Tanah & Bangunan">Tanah / Bangunan / Properti</option>
      <option value="Saham & Bisnis">Saham / Bisnis</option>
      <option value="Barang Berharga">Barang Antik / Lainnya</option>
    `;
  });
}
document.querySelector('#asset-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const d=new FormData(e.currentTarget);
  const type=d.get('asset_type')==='non_liquid'?'Tidak Cair':'Cair';
  const sub=d.get('asset_sub')||'Lainnya';
  const userTitle=d.get('name').trim();
  const storedName=`[${type}: ${sub}] ${userTitle}`;
  const {error}=await db.from('assets').upsert({user_id:activeUser.id,name:storedName,amount:Number(d.get('amount')),updated_at:new Date().toISOString()},{onConflict:'user_id,name'});
  if(error){alert(error.message);return}
  document.querySelector('#asset-dialog').close();
  e.currentTarget.reset();
  await refreshData();
});
document.querySelector('#debt-form').addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(e.currentTarget);const {error}=await db.from('finance_records').insert({user_id:activeUser.id,title:d.get('title'),kind:d.get('kind'),category:d.get('kind')==='debt_payable'?'Utang':'Piutang',amount:Number(d.get('amount')),record_date:d.get('record_date')});if(error){alert(error.message);return}document.querySelector('#debt-dialog').close();e.currentTarget.reset();await refreshData()});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.view===button.dataset.view));
  const view=button.dataset.view;if(view==='overview'){workspace.hidden=true;document.querySelector('.runway-card').scrollIntoView({behavior:'smooth'});return}
  if(view==='transactions')document.querySelector('.transactions-panel').scrollIntoView({behavior:'smooth'});else{renderWorkspace(view);workspace.scrollIntoView({behavior:'smooth'})}
}));
// PWA Service Worker Registration & Auto-Update
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').then((reg)=>{
      console.log('Catat Duit PWA Service Worker registered:', reg.scope);

      // Cek pembaruan berkala dan saat halaman dimuat
      reg.update();

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Service Worker baru siap, langsung aktifkan
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch((err)=>{
      console.error('Service Worker registration failed:', err);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// Bersihkan dan sembunyikan Netlify badge / HUD jika diinjeksi
const removeNetlifyBadge = () => {
  document.querySelectorAll('#nl-badge-frame, #nl-hud-frame, iframe[title*="Netlify"], script[src*="hud?variant=public"]').forEach(el => el.remove());
};
removeNetlifyBadge();
const badgeObserver = new MutationObserver(removeNetlifyBadge);
badgeObserver.observe(document.documentElement, { childList: true, subtree: true });

// --- Fitur Ekspor / Unduh Laporan ---
const reportDialog = document.querySelector('#report-dialog');
const openReportBtn = document.querySelector('#open-report-btn');
const reportFilterMode = document.querySelector('#report-filter-mode');
const reportMonthGroup = document.querySelector('#report-month-group');
const reportRangeGroup = document.querySelector('#report-range-group');
const reportMonthInput = document.querySelector('#report-month-input');
const reportStartDate = document.querySelector('#report-start-date');
const reportEndDate = document.querySelector('#report-end-date');
const reportForm = document.querySelector('#report-form');

if (openReportBtn && reportDialog) {
  openReportBtn.addEventListener('click', () => {
    const curMonth = today().slice(0, 7);
    if (reportMonthInput) reportMonthInput.value = curMonth;
    if (reportStartDate) reportStartDate.value = `${curMonth}-01`;
    if (reportEndDate) reportEndDate.value = today();
    if (reportFilterMode) {
      reportFilterMode.value = 'month';
      reportMonthGroup.hidden = false;
      reportRangeGroup.hidden = true;
    }
    reportDialog.showModal();
  });
}

if (reportFilterMode) {
  reportFilterMode.addEventListener('change', () => {
    const isMonth = reportFilterMode.value === 'month';
    reportMonthGroup.hidden = !isMonth;
    reportRangeGroup.hidden = isMonth;
  });
}

function getFilteredTransactionsForReport() {
  const mode = reportFilterMode ? reportFilterMode.value : 'month';
  let filtered = records.filter(r => ['income', 'expense'].includes(r.kind));
  let periodLabel = '';

  if (mode === 'month') {
    const m = reportMonthInput ? reportMonthInput.value : today().slice(0, 7);
    filtered = filtered.filter(r => monthKey(r.record_date) === m);
    const dateObj = new Date(`${m}-01T00:00:00`);
    periodLabel = isNaN(dateObj.getTime()) ? m : new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(dateObj);
  } else {
    const start = reportStartDate ? reportStartDate.value : '';
    const end = reportEndDate ? reportEndDate.value : '';
    if (start) filtered = filtered.filter(r => r.record_date >= start);
    if (end) filtered = filtered.filter(r => r.record_date <= end);
    periodLabel = `${start || 'Awal'} s.d. ${end || 'Sekarang'}`;
  }

  // Urutkan per record_date descending, dan kronologis input untuk tanggal yang sama
  filtered.sort((a, b) => {
    const dateDiff = b.record_date.localeCompare(a.record_date);
    if (dateDiff !== 0) return dateDiff;
    if (a.created_at && b.created_at) {
      return new Date(a.created_at) - new Date(b.created_at);
    }
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  // Hitung total & kategori pengeluaran terbesar
  const expenses = filtered.filter(r => r.kind === 'expense');
  const incomes = filtered.filter(r => r.kind === 'income');
  const totalExpense = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const totalIncome = incomes.reduce((s, r) => s + Number(r.amount), 0);

  const catMap = {};
  expenses.forEach(r => {
    catMap[r.category] = (catMap[r.category] || 0) + Number(r.amount);
  });

  const categoryRanking = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount], idx) => ({
      rank: idx + 1,
      category: cat,
      amount,
      percentage: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0'
    }));

  return {
    periodLabel,
    transactions: filtered,
    totalIncome,
    totalExpense,
    categoryRanking
  };
}

function exportToExcel(reportData) {
  const { periodLabel, transactions, totalIncome, totalExpense, categoryRanking } = reportData;
  const userEmail = activeUser?.email || 'Pengguna';

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
    <style>
      table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11pt; }
      th, td { border: 1px solid #c0c0c0; padding: 6px 10px; }
      th { background-color: #2e593d; color: #ffffff; text-align: left; }
      .header-title { font-size: 16pt; font-weight: bold; color: #2e593d; }
      .header-sub { font-size: 11pt; color: #555; }
      .section-title { font-size: 13pt; font-weight: bold; background-color: #e6ede6; }
      .text-right { text-align: right; }
      .num-fmt { mso-number-format:"\\#\\,\\#\\#0"; }
      .income { color: #1e7e34; }
      .expense { color: #bd2130; }
    </style>
  </head>
  <body>
    <table>
      <tr><td colspan="5" class="header-title">LAPORAN KEUANGAN - CATAT DUIT</td></tr>
      <tr><td colspan="5" class="header-sub">Akun: ${escapeHtml(userEmail)} | Periode: ${escapeHtml(periodLabel)}</td></tr>
      <tr><td colspan="5" class="header-sub">Dibuat pada: ${new Date().toLocaleString('id-ID')}</td></tr>
      <tr><td colspan="5"></td></tr>

      <tr><th colspan="5" class="section-title">1. RINGKASAN & RANKING PENGELUARAN TERBESAR</th></tr>
      <tr>
        <th>Peringkat</th>
        <th colspan="2">Kategori Pengeluaran</th>
        <th class="text-right">Total Jumlah (Rp)</th>
        <th class="text-right">Persentase</th>
      </tr>
  `;

  if (!categoryRanking.length) {
    html += `<tr><td colspan="5" style="text-align:center;">Tidak ada data pengeluaran pada periode ini.</td></tr>`;
  } else {
    categoryRanking.forEach(c => {
      html += `
        <tr>
          <td>#${c.rank}</td>
          <td colspan="2">${escapeHtml(c.category)}</td>
          <td class="text-right num-fmt">${c.amount}</td>
          <td class="text-right">${c.percentage}%</td>
        </tr>
      `;
    });
  }

  html += `
      <tr>
        <td colspan="3" style="font-weight:bold;">Total Pengeluaran</td>
        <td class="text-right num-fmt expense" style="font-weight:bold;">${totalExpense}</td>
        <td class="text-right">100%</td>
      </tr>
      <tr>
        <td colspan="3" style="font-weight:bold;">Total Pemasukan</td>
        <td class="text-right num-fmt income" style="font-weight:bold;">${totalIncome}</td>
        <td></td>
      </tr>
      <tr>
        <td colspan="3" style="font-weight:bold;">Sisa Bersih (Net Cashflow)</td>
        <td class="text-right num-fmt" style="font-weight:bold;">${totalIncome - totalExpense}</td>
        <td></td>
      </tr>
      <tr><td colspan="5"></td></tr>

      <tr><th colspan="5" class="section-title">2. RINCIAN SEMUA TRANSAKSI</th></tr>
      <tr>
        <th>Tanggal</th>
        <th>Nama Transaksi</th>
        <th>Jenis</th>
        <th>Kategori</th>
        <th class="text-right">Nominal (Rp)</th>
      </tr>
  `;

  if (!transactions.length) {
    html += `<tr><td colspan="5" style="text-align:center;">Tidak ada transaksi ditemukan pada periode ini.</td></tr>`;
  } else {
    transactions.forEach(t => {
      const isInc = t.kind === 'income';
      html += `
        <tr>
          <td>${t.record_date}</td>
          <td>${escapeHtml(t.title)}</td>
          <td class="${isInc ? 'income' : 'expense'}">${isInc ? 'Uang Masuk' : 'Uang Keluar'}</td>
          <td>${escapeHtml(t.category)}</td>
          <td class="text-right num-fmt ${isInc ? 'income' : 'expense'}">${isInc ? t.amount : -t.amount}</td>
        </tr>
      `;
    });
  }

  html += `
    </table>
  </body>
  </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_Keuangan_CatatDuit_${periodLabel.replace(/\s+/g, '_')}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToPDF(reportData) {
  const { periodLabel, transactions, totalIncome, totalExpense, categoryRanking } = reportData;
  const userEmail = activeUser?.email || 'Pengguna';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup diblokir oleh browser. Izinkan popup untuk mencetak/menyimpan PDF.');
    return;
  }

  const printHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Laporan Keuangan - ${escapeHtml(periodLabel)}</title>
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c2720; margin: 0; padding: 20px; font-size: 11pt; }
      .header { border-bottom: 2px solid #2e593d; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
      .header h1 { margin: 0; color: #2e593d; font-size: 20pt; letter-spacing: -0.5px; }
      .header p { margin: 4px 0 0; color: #607366; font-size: 10pt; }
      .summary-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
      .card { border: 1px solid #d4dec9; background: #f9fbf8; border-radius: 8px; padding: 12px; }
      .card-label { font-size: 9pt; color: #607366; font-weight: 600; text-transform: uppercase; }
      .card-val { font-size: 14pt; font-weight: 700; margin-top: 4px; font-family: ui-monospace, monospace; }
      .card-val.inc { color: #2f6e4a; }
      .card-val.exp { color: #b24c3d; }
      .section-heading { font-size: 13pt; font-weight: 700; color: #27382f; margin: 20px 0 10px; border-bottom: 1px solid #e1e7dc; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
      th, td { border: 1px solid #d9e2d5; padding: 7px 10px; text-align: left; }
      th { background: #eaf0e7; color: #27382f; font-weight: 600; }
      .text-right { text-align: right; }
      .mono { font-family: ui-monospace, monospace; }
      .tag-exp { color: #b24c3d; font-weight: 600; }
      .tag-inc { color: #2f6e4a; font-weight: 600; }
      .rank-bar { height: 6px; background: #5a8c43; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 6px; }
      .footer-note { font-size: 8pt; color: #829488; text-align: center; margin-top: 30px; border-top: 1px dashed #d4dec9; padding-top: 10px; }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>Catat Duit.</h1>
        <p>Laporan Rekapitulasi Keuangan & Transaksi</p>
      </div>
      <div style="text-align: right;">
        <p><strong>Periode:</strong> ${escapeHtml(periodLabel)}</p>
        <p><strong>Akun:</strong> ${escapeHtml(userEmail)}</p>
      </div>
    </div>

    <div class="summary-cards">
      <div class="card">
        <div class="card-label">Total Uang Masuk</div>
        <div class="card-val inc">${rupiah(totalIncome)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Uang Keluar</div>
        <div class="card-val exp">${rupiah(totalExpense)}</div>
      </div>
      <div class="card">
        <div class="card-label">Arus Kas Bersih</div>
        <div class="card-val">${rupiah(totalIncome - totalExpense)}</div>
      </div>
    </div>

    <div class="section-heading">Ranking Pengeluaran Berdasarkan Kategori (Terbesar ke Terkecil)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">No</th>
          <th>Kategori</th>
          <th class="text-right" style="width: 140px;">Jumlah</th>
          <th class="text-right" style="width: 160px;">Porsi Pengeluaran</th>
        </tr>
      </thead>
      <tbody>
        ${categoryRanking.length ? categoryRanking.map(c => `
          <tr>
            <td>#${c.rank}</td>
            <td><strong>${escapeHtml(c.category)}</strong></td>
            <td class="text-right mono">${rupiah(c.amount)}</td>
            <td class="text-right mono">
              <span class="rank-bar" style="width: ${c.percentage}%;"></span>
              ${c.percentage}%
            </td>
          </tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center;">Tidak ada pengeluaran pada periode ini.</td></tr>'}
      </tbody>
    </table>

    <div class="section-heading">Daftar Lengkap Transaksi</div>
    <table>
      <thead>
        <tr>
          <th style="width: 85px;">Tanggal</th>
          <th>Nama Transaksi</th>
          <th style="width: 80px;">Jenis</th>
          <th>Kategori</th>
          <th class="text-right" style="width: 130px;">Jumlah (Rp)</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.length ? transactions.map(t => {
          const isInc = t.kind === 'income';
          return `
            <tr>
              <td>${t.record_date}</td>
              <td>${escapeHtml(t.title)}</td>
              <td class="${isInc ? 'tag-inc' : 'tag-exp'}">${isInc ? 'Masuk' : 'Keluar'}</td>
              <td>${escapeHtml(t.category)}</td>
              <td class="text-right mono ${isInc ? 'tag-inc' : 'tag-exp'}">${isInc ? '+' : '-'} ${rupiah(t.amount)}</td>
            </tr>
          `;
        }).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada transaksi ditemukan pada periode ini.</td></tr>'}
      </tbody>
    </table>

    <div class="footer-note">
      Dicetak secara otomatis dari Catat Duit • Uang adalah energi hidupmu.
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 300);
      };
    </script>
  </body>
  </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

function exportToJPG(reportData) {
  const { periodLabel, transactions, totalIncome, totalExpense, categoryRanking } = reportData;
  const userEmail = activeUser?.email || 'Pengguna';

  // Hitung dimensi canvas dinamis berdasarkan jumlah baris
  const rowHeight = 32;
  const catRows = Math.max(1, categoryRanking.length);
  const txRows = Math.max(1, transactions.length);
  const totalHeight = 380 + (catRows * rowHeight) + (txRows * rowHeight) + 120;
  const width = 1100;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  // Header Box
  ctx.fillStyle = '#26422d';
  ctx.fillRect(0, 0, width, 110);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Catat Duit — Laporan Keuangan', 40, 52);

  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#d2e3d3';
  ctx.fillText(`Periode: ${periodLabel}   |   Akun: ${userEmail}   |   Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 40, 84);

  // Summary Cards
  const cardY = 135;
  const cardW = 320;
  const cardH = 75;

  const drawCard = (x, title, val, color) => {
    ctx.fillStyle = '#f7faf5';
    ctx.strokeStyle = '#d5e0cd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#596d5e';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(title.toUpperCase(), x + 16, cardY + 26);

    ctx.fillStyle = color;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(val, x + 16, cardY + 54);
  };

  drawCard(40, 'Total Uang Masuk', rupiah(totalIncome), '#2f6e4a');
  drawCard(390, 'Total Uang Keluar', rupiah(totalExpense), '#b24c3d');
  drawCard(740, 'Arus Kas Bersih', rupiah(totalIncome - totalExpense), '#27382f');

  let curY = 245;

  // 1. Ranking Section
  ctx.fillStyle = '#27382f';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('1. Ranking Pengeluaran Berdasarkan Kategori', 40, curY);
  curY += 15;

  // Table header Ranking
  ctx.fillStyle = '#e8efe5';
  ctx.fillRect(40, curY, 1020, 30);
  ctx.fillStyle = '#223829';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('NO', 55, curY + 20);
  ctx.fillText('KATEGORI PENGELUARAN', 130, curY + 20);
  ctx.fillText('JUMLAH (RP)', 700, curY + 20);
  ctx.fillText('PERSENTASE', 900, curY + 20);
  curY += 30;

  ctx.font = '13px sans-serif';
  if (!categoryRanking.length) {
    ctx.fillStyle = '#839688';
    ctx.fillText('Belum ada pengeluaran pada periode ini.', 55, curY + 22);
    curY += rowHeight;
  } else {
    categoryRanking.forEach((c, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fafbfa';
      ctx.fillRect(40, curY, 1020, rowHeight);
      ctx.strokeStyle = '#e6ede3';
      ctx.strokeRect(40, curY, 1020, rowHeight);

      ctx.fillStyle = '#27382f';
      ctx.fillText(`#${c.rank}`, 55, curY + 21);
      ctx.fillText(c.category, 130, curY + 21);

      ctx.font = '13px monospace';
      ctx.fillText(rupiah(c.amount), 700, curY + 21);
      ctx.fillText(`${c.percentage}%`, 900, curY + 21);
      ctx.font = '13px sans-serif';

      curY += rowHeight;
    });
  }

  curY += 30;

  // 2. Daftar Transaksi
  ctx.fillStyle = '#27382f';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('2. Daftar Lengkap Transaksi', 40, curY);
  curY += 15;

  // Table header Transaksi
  ctx.fillStyle = '#e8efe5';
  ctx.fillRect(40, curY, 1020, 30);
  ctx.fillStyle = '#223829';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('TANGGAL', 55, curY + 20);
  ctx.fillText('NAMA TRANSAKSI', 180, curY + 20);
  ctx.fillText('JENIS', 530, curY + 20);
  ctx.fillText('KATEGORI', 650, curY + 20);
  ctx.fillText('NOMINAL (RP)', 880, curY + 20);
  curY += 30;

  if (!transactions.length) {
    ctx.fillStyle = '#839688';
    ctx.fillText('Tidak ada transaksi ditemukan pada periode ini.', 55, curY + 22);
    curY += rowHeight;
  } else {
    transactions.forEach((t, i) => {
      const isInc = t.kind === 'income';
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fafbfa';
      ctx.fillRect(40, curY, 1020, rowHeight);
      ctx.strokeStyle = '#e6ede3';
      ctx.strokeRect(40, curY, 1020, rowHeight);

      ctx.fillStyle = '#495a4f';
      ctx.font = '12px sans-serif';
      ctx.fillText(t.record_date, 55, curY + 21);

      ctx.fillStyle = '#1e2d24';
      ctx.font = '13px sans-serif';
      const truncatedTitle = t.title.length > 38 ? t.title.slice(0, 35) + '...' : t.title;
      ctx.fillText(truncatedTitle, 180, curY + 21);

      ctx.fillStyle = isInc ? '#2f6e4a' : '#b24c3d';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(isInc ? 'Masuk' : 'Keluar', 530, curY + 21);

      ctx.fillStyle = '#495a4f';
      ctx.font = '12px sans-serif';
      ctx.fillText(t.category || '-', 650, curY + 21);

      ctx.fillStyle = isInc ? '#2f6e4a' : '#b24c3d';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${isInc ? '+' : '-'} ${rupiah(t.amount)}`, 880, curY + 21);

      curY += rowHeight;
    });
  }

  // Footer
  curY += 25;
  ctx.fillStyle = '#829488';
  ctx.font = '12px sans-serif';
  ctx.fillText('Dicetak secara otomatis dari Catat Duit • Uang adalah energi hidupmu.', 40, curY);

  // Convert to JPG download
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Laporan_Keuangan_CatatDuit_${periodLabel.replace(/\s+/g, '_')}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

if (reportForm) {
  reportForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const format = document.querySelector('#report-format-select')?.value || 'excel';
    const reportData = getFilteredTransactionsForReport();

    if (format === 'excel') {
      exportToExcel(reportData);
    } else if (format === 'pdf') {
      exportToPDF(reportData);
    } else if (format === 'jpg') {
      exportToJPG(reportData);
    }

    reportDialog.close();
  });
}

// Expose test hooks for development/verification
window.catatduit = {
  showApp,
  render,
  getRecords: () => records,
  setRecords: (r) => { records = r; },
  getFilteredTransactionsForReport,
  exportToExcel,
  exportToPDF,
  exportToJPG
};

// Keep the unpublished starter design from showing fabricated sample values before login.
showLogin();

// js/05-render.js
// Logika kalkulasi ringkasan keuangan, runway energi hidup, metrik bulanan, dan sinkronisasi saldo kas

function render() {
  const key = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit' }).format(new Date());
  const current = records.filter(r => monthKey(r.record_date) === key);

  const incomeRecords = current.filter(r => r.kind === 'income');
  const expenseRecords = current.filter(r => r.kind === 'expense');

  const income = incomeRecords.reduce((s, r) => s + Number(r.amount), 0);
  const expense = expenseRecords.reduce((s, r) => s + Number(r.amount), 0);
  const monthBalance = income - expense; // Sisa Saldo / Arus Kas Bersih Bulan Ini

  // Akumulasi seluruh arus kas (All-Time) dari transaksi
  const allIncome = records.filter(r => r.kind === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const allExpense = records.filter(r => r.kind === 'expense').reduce((s, r) => s + Number(r.amount), 0);
  const totalCashBalance = allIncome - allExpense; // Saldo Kas Berjalan

  // Pengeluaran bulanan untuk kalkulasi biaya hidup (3 bulan terakhir)
  const expenseByMonth = {};
  records.filter(r => r.kind === 'expense').forEach(r => {
    const mk = monthKey(r.record_date);
    expenseByMonth[mk] = (expenseByMonth[mk] || 0) + Number(r.amount);
  });
  const lastMonths = Object.keys(expenseByMonth).sort().slice(-3);
  const monthlyCost = lastMonths.length ? lastMonths.reduce((s, k) => s + expenseByMonth[k], 0) / lastMonths.length : 0;

  // Nilai aset tercatat
  const liquidAssets = assets.filter(a => parseAssetName(a.name).isLiquid).reduce((s, a) => s + Number(a.amount), 0);
  const nonLiquidAssets = assets.filter(a => !parseAssetName(a.name).isLiquid).reduce((s, a) => s + Number(a.amount), 0);

  // SINKRONISASI SALDO KAS & RUNWAY:
  // Jika aset likuid belum dicatat manual di tab Aset, gunakan saldo kas positif dari transaksi sebagai energi likuid!
  const effectiveLiquid = liquidAssets > 0 ? liquidAssets : Math.max(0, totalCashBalance);
  const totalAssets = (liquidAssets > 0 ? liquidAssets : Math.max(0, totalCashBalance)) + nonLiquidAssets;
  const runway = monthlyCost > 0 ? (effectiveLiquid / monthlyCost) : 0;

  // 1. Kartu Uang Masuk
  const incomeVal = document.querySelector('#income-value');
  const incomeSub = document.querySelector('#income-sub');
  if (incomeVal) incomeVal.textContent = rupiah(income);
  if (incomeSub) incomeSub.textContent = `${incomeRecords.length} transaksi`;

  // 2. Kartu Uang Keluar
  const expenseVal = document.querySelector('#expense-value');
  const expenseSub = document.querySelector('#expense-sub');
  if (expenseVal) expenseVal.textContent = rupiah(expense);
  if (expenseSub) expenseSub.textContent = `${expenseRecords.length} transaksi`;

  // 3. Kartu Sisa Saldo Bulan Ini (Arus Kas Bersih)
  const balanceVal = document.querySelector('#balance-value');
  const balanceSub = document.querySelector('#balance-sub');
  const balanceIcon = document.querySelector('#balance-icon');
  if (balanceVal) {
    const sign = monthBalance > 0 ? '+' : '';
    balanceVal.textContent = `${sign}${rupiah(monthBalance)}`;
    balanceVal.style.color = monthBalance > 0 ? '#497e29' : (monthBalance < 0 ? '#cb5139' : 'inherit');
  }
  if (balanceSub) {
    const statusText = monthBalance >= 0 ? 'Surplus' : 'Defisit';
    const totalSign = totalCashBalance > 0 ? '+' : '';
    balanceSub.innerHTML = `<span class="${monthBalance >= 0 ? 'surplus' : 'deficit'}">[${statusText}]</span> Akumulasi: ${totalSign}${compact(totalCashBalance)}`;
  }
  if (balanceIcon) {
    balanceIcon.textContent = monthBalance >= 0 ? '⚖' : '↘';
    balanceIcon.className = `metric-icon ${monthBalance >= 0 ? 'green' : 'coral'}`;
  }

  // 4. Kartu Total Aset
  const assetsVal = document.querySelector('#assets-value');
  const assetsSub = document.querySelector('#assets-sub');
  if (assetsVal) {
    assetsVal.textContent = rupiah(totalAssets);
  }
  if (assetsSub) {
    assetsSub.textContent = `Cair: ${compact(effectiveLiquid)} · Tetap: ${compact(nonLiquidAssets)}`;
  }

  // Banner Runway Keuangan
  const runwayMonths = document.querySelector('#runway-months');
  if (runwayMonths) runwayMonths.textContent = runway.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const runwayDays = document.querySelector('#runway-days');
  if (runwayDays) runwayDays.textContent = `${Math.round(runway * 30)} hari`;

  const availLabel = document.querySelector('#available-label');
  if (availLabel) availLabel.textContent = compact(effectiveLiquid);

  const costLabel = document.querySelector('#cost-label');
  if (costLabel) costLabel.textContent = compact(monthlyCost);

  const runwayHelp = document.querySelector('.runway-help span');
  if (runwayHelp) {
    runwayHelp.textContent = monthlyCost
      ? (liquidAssets > 0
          ? 'Perkiraan dari aset cair yang Anda catat dan rata-rata pengeluaran hingga 3 bulan terakhir.'
          : 'Perkiraan dari saldo kas transaksi dan rata-rata pengeluaran hingga 3 bulan terakhir.')
      : 'Catat pengeluaran selama beberapa bulan untuk melihat perkiraan kemampuan bertahan.';
  }

  const spendingTotalEl = document.querySelector('#spending-total-amount');
  if (spendingTotalEl) spendingTotalEl.textContent = rupiah(expense);

  renderSpendingBarChart(expense);
  renderRows();
  if (workspace && !workspace.hidden) renderWorkspace(workspace.dataset.view || 'transactions');
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

// js/05-render.js
// Logika kalkulasi ringkasan keuangan, runway energi hidup, metrik bulanan, dan grafik pengeluaran

function render() {
  const key = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit' }).format(new Date());
  const current = records.filter(r => monthKey(r.record_date) === key);
  const income = current.filter(r => r.kind === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const expense = current.filter(r => r.kind === 'expense').reduce((s, r) => s + Number(r.amount), 0);
  const expenseByMonth = {};
  records.filter(r => r.kind === 'expense').forEach(r => {
    const mk = monthKey(r.record_date);
    expenseByMonth[mk] = (expenseByMonth[mk] || 0) + Number(r.amount);
  });
  const lastMonths = Object.keys(expenseByMonth).sort().slice(-3);
  const monthlyCost = lastMonths.length ? lastMonths.reduce((s, k) => s + expenseByMonth[k], 0) / lastMonths.length : 0;
  const liquidAssets = assets.filter(a => parseAssetName(a.name).isLiquid).reduce((s, a) => s + Number(a.amount), 0);
  const nonLiquidAssets = assets.filter(a => !parseAssetName(a.name).isLiquid).reduce((s, a) => s + Number(a.amount), 0);
  const totalAssets = liquidAssets + nonLiquidAssets;
  const runway = monthlyCost ? liquidAssets / monthlyCost : 0;

  const incomeVal = document.querySelector('#income-value');
  if (incomeVal) incomeVal.textContent = rupiah(income);

  const expenseVal = document.querySelector('#expense-value');
  if (expenseVal) expenseVal.textContent = rupiah(expense);

  const assetsVal = document.querySelector('#assets-value');
  if (assetsVal) {
    assetsVal.innerHTML = `${rupiah(totalAssets)}<div style="font-size:9px;color:#859288;font-weight:400;margin-top:4px;">Cair: ${compact(liquidAssets)} · Tetap: ${compact(nonLiquidAssets)}</div>`;
  }

  const runwayMonths = document.querySelector('#runway-months');
  if (runwayMonths) runwayMonths.textContent = runway.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const runwayDays = document.querySelector('#runway-days');
  if (runwayDays) runwayDays.textContent = `${Math.round(runway * 30)} hari`;

  const availLabel = document.querySelector('#available-label');
  if (availLabel) availLabel.textContent = compact(liquidAssets);

  const costLabel = document.querySelector('#cost-label');
  if (costLabel) costLabel.textContent = compact(monthlyCost);

  const runwayHelp = document.querySelector('.runway-help span');
  if (runwayHelp) {
    runwayHelp.textContent = monthlyCost ? 'Perkiraan dari aset cair (likuid) yang Anda catat dan rata-rata pengeluaran hingga 3 bulan terakhir.' : 'Catat pengeluaran selama beberapa bulan untuk melihat perkiraan kemampuan bertahan.';
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

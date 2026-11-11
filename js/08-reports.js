// js/08-reports.js
// Fitur ekspor/unduh laporan transaksi ke format Excel (.xls), PDF, dan gambar JPG

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
    if (reportMonthGroup) reportMonthGroup.hidden = !isMonth;
    if (reportRangeGroup) reportRangeGroup.hidden = isMonth;
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

    if (reportDialog) reportDialog.close();
  });
}

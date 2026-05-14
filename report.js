// ===== GSTFlow Pro — report.js =====
'use strict';

function _f(n) { return Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:2}); }
function _r(n) { return '₹' + _f(n); }

/* ===== CSV ===== */
function exportCSV(d, c) {
  const rows = [
    ['GSTFlow Pro – GSTR-3B Monthly Report'],
    ['Company', c.name], ['GSTIN', c.gst], ['FY', c.fy], ['Month', c.month], ['Report Date', c.date], [],
    ['SECTION','HEAD','AMOUNT (INR)'],
    ['Output Tax','IGST', d.outIGST], ['Output Tax','CGST', d.outCGST], ['Output Tax','SGST', d.outSGST], ['Output Tax','TOTAL', d.totalLiability], [],
    ['ITC','IGST', d.itcIGST], ['ITC','CGST', d.itcCGST], ['ITC','SGST', d.itcSGST], ['ITC','TOTAL', d.totalITC], [],
    ['RCM','IGST', d.rcmIGST], ['RCM','CGST', d.rcmCGST], ['RCM','SGST', d.rcmSGST], ['RCM','TOTAL', d.rcmTotal], [],
    ['Cash Ledger','IGST', d.cashIGST], ['Cash Ledger','CGST', d.cashCGST], ['Cash Ledger','SGST', d.cashSGST], [],
    ['OFFSET','IGST Credit → IGST', d.offset.i2i||0], ['OFFSET','IGST Credit → CGST', d.offset.i2c||0],
    ['OFFSET','IGST Credit → SGST', d.offset.i2s||0], ['OFFSET','CGST Credit → CGST', d.offset.c2c||0],
    ['OFFSET','SGST Credit → SGST', d.offset.s2s||0], ['OFFSET','Cash → IGST', d.offset.ci||0],
    ['OFFSET','Cash → CGST', d.offset.cc||0], ['OFFSET','Cash → SGST', d.offset.cs||0], [],
    ['SUMMARY','Total Liability', d.totalLiability], ['SUMMARY','Total ITC Used', d.totalITCUsed],
    ['SUMMARY','Total Cash Used', d.totalCashUsed], ['SUMMARY','RCM Paid', d.rcmTotal],
    ['SUMMARY','Final Payable', d.finalPayable], ['SUMMARY','Carry Forward ITC', d.carryFwd],
    ['SUMMARY','Excess ITC', d.excessITC],
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  _dl(new Blob([csv], {type:'text/csv'}), `GSTR3B_${c.month}_${c.name}.csv`);
  showToast('✅ CSV exported!', 'ok');
}

/* ===== EXCEL ===== */
function exportExcel(d, c) {
  const html = `<html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;}
    h1{background:#1e3a8a;color:#fff;padding:14px 18px;font-size:16px;margin-bottom:12px;}
    .info{background:#f1f5f9;padding:10px 14px;margin-bottom:14px;border-left:4px solid #2a5cff;}
    table{border-collapse:collapse;width:100%;margin-bottom:16px;}
    th{background:#1e3a8a;color:#fff;padding:9px 13px;text-align:left;font-size:11px;text-transform:uppercase;}
    th:last-child{text-align:right;}
    td{padding:8px 13px;border-bottom:1px solid #e2e8f0;}
    td:last-child{text-align:right;font-family:Courier New,monospace;}
    tr:nth-child(even)td{background:#f8fafc;}
    .tot td{background:#dbeafe!important;font-weight:700;color:#1e3a8a;}
    h2{font-size:13px;font-weight:700;color:#1e3a8a;padding:8px 0 5px;border-bottom:2px solid #bfdbfe;margin-bottom:10px;}
    .footer{color:#94a3b8;font-size:10px;margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;}
  </style></head><body>
  <h1>GSTFlow Pro – GSTR-3B Monthly GST Report</h1>
  <div class="info"><b>${c.name}</b> &nbsp;|&nbsp; GSTIN: ${c.gst} &nbsp;|&nbsp; ${c.month} ${c.fy} &nbsp;|&nbsp; Report Date: ${c.date}</div>
  <h2>Output Tax Liability</h2>
  <table><tr><th>Head</th><th>Amount (₹)</th></tr>
  <tr><td>IGST</td><td>${_f(d.outIGST)}</td></tr>
  <tr><td>CGST</td><td>${_f(d.outCGST)}</td></tr>
  <tr><td>SGST</td><td>${_f(d.outSGST)}</td></tr>
  <tr class="tot"><td>Total Output Tax</td><td>${_f(d.totalLiability)}</td></tr></table>
  <h2>Input Tax Credit</h2>
  <table><tr><th>Head</th><th>Amount (₹)</th></tr>
  <tr><td>ITC IGST</td><td>${_f(d.itcIGST)}</td></tr>
  <tr><td>ITC CGST</td><td>${_f(d.itcCGST)}</td></tr>
  <tr><td>ITC SGST</td><td>${_f(d.itcSGST)}</td></tr>
  <tr class="tot"><td>Total ITC</td><td>${_f(d.totalITC)}</td></tr></table>
  <h2>RCM Details</h2>
  <table><tr><th>Head</th><th>Amount (₹)</th></tr>
  <tr><td>RCM IGST</td><td>${_f(d.rcmIGST)}</td></tr>
  <tr><td>RCM CGST</td><td>${_f(d.rcmCGST)}</td></tr>
  <tr><td>RCM SGST</td><td>${_f(d.rcmSGST)}</td></tr>
  <tr class="tot"><td>Total RCM</td><td>${_f(d.rcmTotal)}</td></tr></table>
  <h2>GST Offset Summary</h2>
  <table><tr><th>Description</th><th>Amount (₹)</th></tr>
  <tr><td>IGST Credit → IGST Liability</td><td>${_f(d.offset.i2i||0)}</td></tr>
  <tr><td>IGST Credit → CGST Liability</td><td>${_f(d.offset.i2c||0)}</td></tr>
  <tr><td>IGST Credit → SGST Liability</td><td>${_f(d.offset.i2s||0)}</td></tr>
  <tr><td>CGST Credit → CGST Liability</td><td>${_f(d.offset.c2c||0)}</td></tr>
  <tr><td>SGST Credit → SGST Liability</td><td>${_f(d.offset.s2s||0)}</td></tr>
  <tr><td>Cash Paid for IGST</td><td>${_f(d.offset.ci||0)}</td></tr>
  <tr><td>Cash Paid for CGST</td><td>${_f(d.offset.cc||0)}</td></tr>
  <tr><td>Cash Paid for SGST</td><td>${_f(d.offset.cs||0)}</td></tr>
  <tr class="tot"><td>Total ITC Used</td><td>${_f(d.totalITCUsed)}</td></tr></table>
  <h2>Final Summary</h2>
  <table><tr><th>Description</th><th>Amount (₹)</th></tr>
  <tr><td>Total Tax Liability</td><td>${_f(d.totalLiability)}</td></tr>
  <tr><td>Total ITC Used</td><td>${_f(d.totalITCUsed)}</td></tr>
  <tr><td>Total Cash Used</td><td>${_f(d.totalCashUsed)}</td></tr>
  <tr><td>RCM Paid (Cash)</td><td>${_f(d.rcmTotal)}</td></tr>
  <tr class="tot"><td>Final Amount Payable</td><td>${_f(d.finalPayable)}</td></tr>
  <tr><td>Carry Forward ITC</td><td>${_f(d.carryFwd)}</td></tr>
  <tr><td>Excess ITC (Refund Eligible)</td><td>${_f(d.excessITC)}</td></tr></table>
  <div class="footer">Generated by GSTFlow Pro on ${new Date().toLocaleString('en-IN')} | For assistance purposes only. Verify with your CA before filing.</div>
  </body></html>`;
  _dl(new Blob([html], {type:'application/vnd.ms-excel'}), `GSTR3B_${c.month}_${c.name}.xls`);
  showToast('✅ Excel exported!', 'ok');
}

/* ===== PDF (print window) ===== */
function exportPDF(d, c) {
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>GSTR-3B – ${c.name}</title>
  <style>
    @page{margin:18mm 14mm;size:A4}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;color:#0f172a;font-size:12px;background:#fff}
    .hdr{background:linear-gradient(135deg,#1e3a8a,#5b21b6);color:#fff;padding:22px 24px;border-radius:0 0 14px 14px;margin-bottom:18px}
    .hdr h1{font-size:20px;font-weight:900;margin-bottom:3px}
    .hdr p{font-size:12px;opacity:.85}
    .cinfo{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#f1f5f9;padding:14px 16px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px}
    .ci label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;display:block;margin-bottom:2px}
    .ci span{font-size:12.5px;font-weight:600}
    .stitle{font-size:13px;font-weight:800;padding:9px 13px;border-radius:6px;margin:14px 0 8px}
    .stb{background:#dbeafe;color:#1e3a8a} .stg{background:#d1fae5;color:#065f46}
    .sto{background:#fef3c7;color:#92400e} .stp{background:#ede9fe;color:#5b21b6}
    .str{background:#fee2e2;color:#991b1b}
    table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11.5px}
    th{background:#1e3a8a;color:#fff;padding:8px 12px;text-align:left}
    th:last-child{text-align:right}
    td{padding:7px 12px;border-bottom:1px solid #e2e8f0}
    td:last-child{text-align:right;font-family:Courier New,monospace;font-weight:600}
    tr:nth-child(even)td{background:#f8fafc}
    .tr td{background:#dbeafe!important;font-weight:800;color:#1e3a8a}
    .scg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}
    .sc{padding:13px;border-radius:8px;color:#fff;text-align:center}
    .sc label{font-size:9.5px;font-weight:700;text-transform:uppercase;opacity:.82;display:block;margin-bottom:5px}
    .sc span{font-size:15px;font-weight:800;font-family:Courier New,monospace}
    .s1{background:#2a5cff} .s2{background:#059669} .s3{background:#d97706}
    .s4{background:#dc2626} .s5{background:#7c3aed} .s6{background:#0d9488}
    .bdg{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
    .bi{background:#dbeafe;color:#1e3a8a} .bc{background:#ede9fe;color:#5b21b6}
    .bs{background:#ccfbf1;color:#0f766e} .bca{background:#fee2e2;color:#991b1b}
    .rcmn{background:#fef3c7;border:1px solid #d97706;border-left:4px solid #d97706;padding:11px 14px;border-radius:6px;font-size:11px;color:#92400e;margin-top:9px}
    .foot{margin-top:24px;padding-top:12px;border-top:2px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
    .wm{position:fixed;bottom:50px;right:30px;font-size:70px;opacity:.03;transform:rotate(-28deg);font-weight:900;color:#2a5cff;pointer-events:none}
  </style></head><body>
  <div class="wm">GSTFlow</div>
  <div class="hdr"><h1>📊 GSTR-3B Monthly GST Report</h1>
  <p>For The Month Of ${c.month} ${c.fy} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p></div>
  <div class="cinfo">
    <div class="ci"><label>Company Name</label><span>${c.name||'—'}</span></div>
    <div class="ci"><label>GSTIN</label><span>${c.gst||'—'}</span></div>
    <div class="ci"><label>Financial Year</label><span>${c.fy||'—'}</span></div>
    <div class="ci"><label>Month</label><span>${c.month||'—'}</span></div>
    <div class="ci"><label>Report Date</label><span>${c.date||'—'}</span></div>
    <div class="ci"><label>Form</label><span>GSTR-3B</span></div>
  </div>
  <div class="stitle stb">📤 Output Tax Liability</div>
  <table><tr><th>Tax Head</th><th>Amount (₹)</th></tr>
  <tr><td><span class="bdg bi">IGST</span> Integrated GST</td><td>${_f(d.outIGST)}</td></tr>
  <tr><td><span class="bdg bc">CGST</span> Central GST</td><td>${_f(d.outCGST)}</td></tr>
  <tr><td><span class="bdg bs">SGST</span> State GST</td><td>${_f(d.outSGST)}</td></tr>
  <tr class="tr"><td>Total Output Tax Liability</td><td>${_f(d.totalLiability)}</td></tr></table>
  <div class="stitle stg">📥 Input Tax Credit (ITC)</div>
  <table><tr><th>Tax Head</th><th>Amount (₹)</th></tr>
  <tr><td><span class="bdg bi">IGST</span> ITC Credit</td><td>${_f(d.itcIGST)}</td></tr>
  <tr><td><span class="bdg bc">CGST</span> ITC Credit</td><td>${_f(d.itcCGST)}</td></tr>
  <tr><td><span class="bdg bs">SGST</span> ITC Credit</td><td>${_f(d.itcSGST)}</td></tr>
  <tr class="tr"><td>Total ITC</td><td>${_f(d.totalITC)}</td></tr></table>
  <div class="stitle sto">🔄 Reverse Charge Mechanism (RCM)</div>
  <table><tr><th>Tax Head</th><th>Amount (₹)</th></tr>
  <tr><td>RCM IGST</td><td>${_f(d.rcmIGST)}</td></tr>
  <tr><td>RCM CGST</td><td>${_f(d.rcmCGST)}</td></tr>
  <tr><td>RCM SGST</td><td>${_f(d.rcmSGST)}</td></tr>
  <tr class="tr"><td>Total RCM</td><td>${_f(d.rcmTotal)}</td></tr></table>
  <div class="rcmn">⚠️ <b>RCM Rule:</b> Must be paid via Cash Ledger. ITC available only after payment. Existing ITC cannot offset RCM.</div>
  <div class="stitle stp">⚖️ GST Offset Calculation (Step-by-Step)</div>
  <table><tr><th>Step</th><th>Credit Used</th><th>Applied Against</th><th>Amount (₹)</th></tr>
  <tr><td>1a</td><td><span class="bdg bi">IGST Credit</span></td><td>IGST Liability</td><td>${_f(d.offset.i2i||0)}</td></tr>
  <tr><td>1b</td><td><span class="bdg bi">IGST Credit</span></td><td>CGST Liability</td><td>${_f(d.offset.i2c||0)}</td></tr>
  <tr><td>1c</td><td><span class="bdg bi">IGST Credit</span></td><td>SGST Liability</td><td>${_f(d.offset.i2s||0)}</td></tr>
  <tr><td>2</td><td><span class="bdg bc">CGST Credit</span></td><td>CGST Liability</td><td>${_f(d.offset.c2c||0)}</td></tr>
  <tr><td>3</td><td><span class="bdg bs">SGST Credit</span></td><td>SGST Liability</td><td>${_f(d.offset.s2s||0)}</td></tr>
  <tr><td>4a</td><td><span class="bdg bca">Cash Ledger</span></td><td>IGST Liability</td><td>${_f(d.offset.ci||0)}</td></tr>
  <tr><td>4b</td><td><span class="bdg bca">Cash Ledger</span></td><td>CGST Liability</td><td>${_f(d.offset.cc||0)}</td></tr>
  <tr><td>4c</td><td><span class="bdg bca">Cash Ledger</span></td><td>SGST Liability</td><td>${_f(d.offset.cs||0)}</td></tr>
  <tr class="tr"><td colspan="3">Total ITC Utilized</td><td>${_f(d.totalITCUsed)}</td></tr></table>
  <div class="stitle str">📊 Final Summary</div>
  <div class="scg">
    <div class="sc s1"><label>Total Liability</label><span>₹${_f(d.totalLiability)}</span></div>
    <div class="sc s2"><label>ITC Used</label><span>₹${_f(d.totalITCUsed)}</span></div>
    <div class="sc s3"><label>Cash Used</label><span>₹${_f(d.totalCashUsed)}</span></div>
    <div class="sc s4"><label>Final Payable</label><span>₹${_f(d.finalPayable)}</span></div>
    <div class="sc s5"><label>RCM Paid</label><span>₹${_f(d.rcmTotal)}</span></div>
    <div class="sc s6"><label>Carry Forward ITC</label><span>₹${_f(d.carryFwd)}</span></div>
  </div>
  <div class="foot">
    <p><b>GSTFlow Pro</b> — Smart GSTR-3B Calculation & Reporting System</p>
    <p>${c.name} | ${c.gst} | ${c.month} ${c.fy} | For assistance only — verify with your CA before filing.</p>
  </div>
  <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`);
  w.document.close();
  showToast('📄 PDF report opened!', 'ok');
}

function _dl(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

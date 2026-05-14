// ===== GSTFlow Pro — script.js =====
// Formulas strictly follow CGST Rules 2017
'use strict';

let _lastData = null;

const $ = id => document.getElementById(id);
const n = id => parseFloat($(id)?.value) || 0;
const f = v => '₹' + Number(v||0).toLocaleString('en-IN', {minimumFractionDigits:2});

/* ===== TOAST ===== */
function showToast(msg, type='inf') {
  const tc = $('tc');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => { t.style.animation='tout .3s ease forwards'; setTimeout(()=>t.remove(),320); }, 3200);
}

/* ===== ALERT ===== */
function showAlert(title, msg, ico='⚠️') {
  $('aIco').textContent = ico;
  $('aTitle').textContent = title;
  $('aMsg').textContent = msg;
  $('aOverlay').classList.add('open');
}
function closeAlert() { $('aOverlay').classList.remove('open'); }

/* ===== THEME ===== */
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  showToast('🎨 Theme changed', 'inf');
}

/* ===== LIVE TOTALS ===== */
function liveTotals() {
  // Output Tax Liability (Intrastate: CGST+SGST, Interstate: IGST)
  const totalOut = n('outIGST') + n('outCGST') + n('outSGST');
  // Total ITC = ITC_CGST + ITC_SGST + ITC_IGST
  const totalITC = n('itcIGST') + n('itcCGST') + n('itcSGST');
  // RCM Liability = RCM_CGST + RCM_SGST + RCM_IGST
  const totalRCM = n('rcmIGST') + n('rcmCGST') + n('rcmSGST');
  // Cash Ledger deposited balance
  const totalCash = n('cashIGST') + n('cashCGST') + n('cashSGST');
  // Credit Ledger = ITC_CGST + ITC_SGST + ITC_IGST
  const totalCred = n('itcIGST') + n('itcCGST') + n('itcSGST');

  $('totOut').textContent  = f(totalOut);
  $('totITC').textContent  = f(totalITC);
  $('totRCM').textContent  = f(totalRCM);
  $('totCash').textContent = f(totalCash);
  if ($('totCharges')) $('totCharges').textContent = f(n('interest') + n('lateFee') + n('penalty'));
}

/* ===== MONTH BADGE ===== */
function updateBadge() {
  const m = $('sel_month').value, fy = $('inp_fy').value || '';
  $('badge').textContent  = m ? `${m}${fy?' '+fy:''}` : '______';
  $('rh_sub').textContent = m
    ? `GST Report For The Month Of ${m}${fy?' '+fy:''}`
    : 'GST Report For The Month Of ______';
}

/* ===== GSTIN VALIDATION ===== */
function validGST(v) {
  return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
}

/* ================================================================
   MAIN CALCULATE ENGINE
   Strictly following CGST Rules 2017 formulas:

   OUTPUT TAX LIABILITY
   ─────────────────────
   Intrastate:  CGST_out = (Rate/2) × Taxable Value
                SGST_out = (Rate/2) × Taxable Value
   Interstate:  IGST_out = Rate × Taxable Value
   Total Output = CGST_out + SGST_out + IGST_out + RCM_Liability

   CREDIT LEDGER (ITC) = ITC_CGST + ITC_SGST + ITC_IGST
   OFFSET ORDER:
     Step 1: ITC_IGST → IGST_out (first)
             Remaining ITC_IGST → CGST_out
             Remaining ITC_IGST → SGST_out
     Step 2: ITC_CGST → CGST_out (first)
             Remaining ITC_CGST → IGST_out
             ITC_CGST ↛ SGST (NOT ALLOWED)
     Step 3: ITC_SGST → SGST_out (first)
             Remaining ITC_SGST → IGST_out
             ITC_SGST ↛ CGST (NOT ALLOWED)
     Step 4: Remaining Liability → Cash Ledger (head-wise)

   CASH LEDGER = Deposited Cash − Utilized Cash
   RCM → Cash Ledger ONLY (RCM ↛ Credit Ledger)
   After RCM paid → RCM_Paid becomes eligible ITC
   Credit_Ledger_new = Credit_Ledger_old + RCM_Paid

   FINAL PAYABLE = Net GST Liability + RCM + Interest + Penalty
   ================================================================ */
function calculate() {
  const gst = $('inp_gst').value.trim().toUpperCase();
  if (!validGST(gst)) {
    showAlert('Invalid GSTIN','Enter a valid 15-char GSTIN.\nExample: 22AAAAA0000A1Z5','❌');
    return;
  }

  const fields = ['outIGST','outCGST','outSGST','itcIGST','itcCGST','itcSGST',
                  'rcmIGST','rcmCGST','rcmSGST','cashIGST','cashCGST','cashSGST',
                  'interest','lateFee','penalty'];
  for (const id of fields) {
    if (n(id) < 0) { showAlert('Negative Value',`"${id}" cannot be negative.`,'⚠️'); return; }
  }

  const btn = $('calcBtn');
  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');

    // ════════════════════════════════════════════════════════════
    // 1. OUTPUT TAX LIABILITY
    //    Total Output = CGST_out + SGST_out + IGST_out
    //    (RCM handled separately — must go through Cash Ledger)
    // ════════════════════════════════════════════════════════════
    const outIGST = n('outIGST');   // IGSTout = GST Rate × Taxable Value
    const outCGST = n('outCGST');   // CGSTout = (GST Rate/2) × Taxable Value
    const outSGST = n('outSGST');   // SGSTout = (GST Rate/2) × Taxable Value
    const totalOutputTax = outIGST + outCGST + outSGST;

    // ════════════════════════════════════════════════════════════
    // 2. RCM LIABILITY
    //    RCM_Liability = RCM_CGST + RCM_SGST + RCM_IGST
    //    RCM → Cash Ledger ONLY (cannot use ITC credit)
    //    After payment: RCM_Paid → becomes eligible ITC
    // ════════════════════════════════════════════════════════════
    const rcmIGST  = n('rcmIGST');
    const rcmCGST  = n('rcmCGST');
    const rcmSGST  = n('rcmSGST');
    const rcmTotal = rcmIGST + rcmCGST + rcmSGST;

    // ════════════════════════════════════════════════════════════
    // 3. CREDIT LEDGER (ITC Opening Balance)
    //    Credit Ledger = ITC_IGST + ITC_CGST + ITC_SGST
    //    These are the ELIGIBLE Input Credits
    // ════════════════════════════════════════════════════════════
    const itcIGST    = n('itcIGST');  // ITC_IGST = Eligible Input IGST
    const itcCGST    = n('itcCGST');  // ITC_CGST = Eligible Input CGST
    const itcSGST    = n('itcSGST');  // ITC_SGST = Eligible Input SGST
    const totalITC   = itcIGST + itcCGST + itcSGST;

    // Credit Ledger opening = Total ITC
    const credOpenIG = itcIGST;
    const credOpenCG = itcCGST;
    const credOpenSG = itcSGST;

    // ════════════════════════════════════════════════════════════
    // 4. CASH LEDGER (Deposited Cash Opening Balance)
    //    Cash Ledger = Deposited Cash − Utilized Cash
    //    Used for: Remaining GST liability, RCM, Interest, Late Fee, Penalty
    // ════════════════════════════════════════════════════════════
    const cashIGST    = n('cashIGST');
    const cashCGST    = n('cashCGST');
    const cashSGST    = n('cashSGST');
    const totalCashOp = cashIGST + cashCGST + cashSGST;

    // Additional charges (paid from Cash Ledger)
    const interest = n('interest');
    const lateFee  = n('lateFee');
    const penalty  = n('penalty');

    // ════════════════════════════════════════════════════════════
    // 5. LIABILITY OFFSET — Credit Ledger (ITC) Usage
    //    Working trackers for liability and credit remaining
    // ════════════════════════════════════════════════════════════
    let liIG = outIGST;   // IGST liability remaining
    let liCG = outCGST;   // CGST liability remaining
    let liSG = outSGST;   // SGST liability remaining

    let remIG = itcIGST;  // IGST ITC credit remaining
    let remCG = itcCGST;  // CGST ITC credit remaining
    let remSG = itcSGST;  // SGST ITC credit remaining

    const off = {};

    // ── STEP 1: Use ITC_IGST ────────────────────────────────────
    // Formula: IGST_out = IGST_out − ITC_IGST
    off.i2i = Math.min(remIG, liIG);   // ITC_IGST → IGST_out
    remIG -= off.i2i;  liIG -= off.i2i;

    // Formula: CGST_out = CGST_out − Remaining ITC_IGST
    off.i2c = Math.min(remIG, liCG);   // Remaining ITC_IGST → CGST_out
    remIG -= off.i2c;  liCG -= off.i2c;

    // Formula: SGST_out = SGST_out − Remaining ITC_IGST
    off.i2s = Math.min(remIG, liSG);   // Remaining ITC_IGST → SGST_out
    remIG -= off.i2s;  liSG -= off.i2s;
    // remIG = carry forward IGST ITC

    // ── STEP 2: Use ITC_CGST ────────────────────────────────────
    // Formula: CGST_out = CGST_out − ITC_CGST
    // Rule: ITC_CGST → CGST (first), then → IGST
    // Rule: ITC_CGST ↛ SGST (NOT ALLOWED)
    off.c2c = Math.min(remCG, liCG);   // ITC_CGST → CGST_out
    remCG -= off.c2c;  liCG -= off.c2c;

    off.c2i = Math.min(remCG, liIG);   // Remaining ITC_CGST → IGST_out
    remCG -= off.c2i;  liIG -= off.c2i;
    // remCG = carry forward CGST ITC
    // CGST ↛ SGST — strictly not allowed

    // ── STEP 3: Use ITC_SGST ────────────────────────────────────
    // Formula: SGST_out = SGST_out − ITC_SGST
    // Rule: ITC_SGST → SGST (first), then → IGST
    // Rule: ITC_SGST ↛ CGST (NOT ALLOWED)
    off.s2s = Math.min(remSG, liSG);   // ITC_SGST → SGST_out
    remSG -= off.s2s;  liSG -= off.s2s;

    off.s2i = Math.min(remSG, liIG);   // Remaining ITC_SGST → IGST_out
    remSG -= off.s2i;  liIG -= off.s2i;
    // remSG = carry forward SGST ITC
    // SGST ↛ CGST — strictly not allowed

    // ── STEP 4: Remaining Liability → Cash Ledger ───────────────
    // Remaining Liability = Output Liability − Utilized ITC
    // Cash Ledger usage (head-wise only):
    // Cash IGST → IGST liability only
    // Cash CGST → CGST liability only
    // Cash SGST → SGST liability only
    off.ci = Math.min(cashIGST, liIG);  liIG -= off.ci;
    off.cc = Math.min(cashCGST, liCG);  liCG -= off.cc;
    off.cs = Math.min(cashSGST, liSG);  liSG -= off.cs;

    // ════════════════════════════════════════════════════════════
    // 6. RCM PAYMENT — Cash Ledger Only
    //    RCM_Liability → Cash Ledger ONLY (rule: RCM ↛ Credit Ledger)
    //    Cash balance after step 4 is used for RCM
    // ════════════════════════════════════════════════════════════
    const cashAfterLiIG = Math.max(0, cashIGST - off.ci);
    const cashAfterLiCG = Math.max(0, cashCGST - off.cc);
    const cashAfterLiSG = Math.max(0, cashSGST - off.cs);

    // Pay RCM from remaining cash (head-wise)
    off.ri = Math.min(cashAfterLiIG, rcmIGST);  // Cash → RCM IGST
    off.rc = Math.min(cashAfterLiCG, rcmCGST);  // Cash → RCM CGST
    off.rs = Math.min(cashAfterLiSG, rcmSGST);  // Cash → RCM SGST

    const rcmPaidTotal   = off.ri + off.rc + off.rs;
    const rcmUnpaid      = rcmTotal - rcmPaidTotal;

    // ════════════════════════════════════════════════════════════
    // 7. CREDIT LEDGER — CLOSING BALANCE
    //    Closing = Opening − ITC Utilized
    //    After RCM paid → Credit_Ledger_new = Credit_Ledger_old + RCM_Paid
    // ════════════════════════════════════════════════════════════
    const itcUsedIG  = off.i2i + off.i2c + off.i2s;
    const itcUsedCG  = off.c2c + off.c2i;
    const itcUsedSG  = off.s2s + off.s2i;

    const credCloseIG_beforeRCM = Math.max(0, credOpenIG - itcUsedIG);
    const credCloseCG_beforeRCM = Math.max(0, credOpenCG - itcUsedCG);
    const credCloseSG_beforeRCM = Math.max(0, credOpenSG - itcUsedSG);

    // After RCM is paid: RCM_Paid → eligible ITC added to Credit Ledger
    // Credit_Ledger_new = Credit_Ledger_old + RCM_Paid (per head)
    const credCloseIG = credCloseIG_beforeRCM + off.ri;  // IGST credit ledger + RCM IGST paid
    const credCloseCG = credCloseCG_beforeRCM + off.rc;  // CGST credit ledger + RCM CGST paid
    const credCloseSG = credCloseSG_beforeRCM + off.rs;  // SGST credit ledger + RCM SGST paid

    // ════════════════════════════════════════════════════════════
    // 8. CASH LEDGER — CLOSING BALANCE
    //    Cash Ledger = Deposited Cash − Utilized Cash
    //    Utilized = Liability paid + RCM paid + Interest + Late Fee + Penalty
    // ════════════════════════════════════════════════════════════
    // Total charges deducted from cash (interest/lateFee/penalty split proportionally
    // or from remaining cash balance after liability + RCM)
    const cashAfterRCM_IG = Math.max(0, cashAfterLiIG - off.ri);
    const cashAfterRCM_CG = Math.max(0, cashAfterLiCG - off.rc);
    const cashAfterRCM_SG = Math.max(0, cashAfterLiSG - off.rs);
    const totalCashAfterRCM = cashAfterRCM_IG + cashAfterRCM_CG + cashAfterRCM_SG;

    // Interest + Late Fee + Penalty paid from remaining cash balance
    const totalCharges = interest + lateFee + penalty;
    const chargesPaid  = Math.min(totalCashAfterRCM, totalCharges);
    const chargesUnpaid = Math.max(0, totalCharges - chargesPaid);

    // Distribute charges proportionally across IGST/CGST/SGST cash heads
    // (simplified: deduct from IGST first, then CGST, then SGST)
    let remCharges = chargesPaid;
    const chargePaidIG = Math.min(cashAfterRCM_IG, remCharges); remCharges -= chargePaidIG;
    const chargePaidCG = Math.min(cashAfterRCM_CG, remCharges); remCharges -= chargePaidCG;
    const chargePaidSG = Math.min(cashAfterRCM_SG, remCharges);

    // Cash Ledger Closing = Deposited − All Utilized
    const cashCloseIG = Math.max(0, cashIGST - off.ci - off.ri - chargePaidIG);
    const cashCloseCG = Math.max(0, cashCGST - off.cc - off.rc - chargePaidCG);
    const cashCloseSG = Math.max(0, cashSGST - off.cs - off.rs - chargePaidSG);

    // ════════════════════════════════════════════════════════════
    // 9. SUMMARY TOTALS
    // ════════════════════════════════════════════════════════════
    const totalITCUsed  = itcUsedIG + itcUsedCG + itcUsedSG;
    const totalCashUsed = off.ci + off.cc + off.cs + rcmPaidTotal + chargesPaid;

    // Net GST Liability = Total Output − Total Utilized ITC
    const netGSTLiability = Math.max(0, totalOutputTax - totalITCUsed);

    // Final Amount Payable = Net GST Liability + RCM + Interest + Late Fee + Penalty
    const finalPayable = liIG + liCG + liSG + rcmUnpaid + chargesUnpaid;

    const carryFwdIG = remIG;
    const carryFwdCG = remCG;
    const carryFwdSG = remSG;
    const carryFwd   = remIG + remCG + remSG;
    const excessITC  = Math.max(0, totalITC - totalITCUsed - carryFwd);
    const remCashBal = cashCloseIG + cashCloseCG + cashCloseSG;

    const d = {
      // inputs
      outIGST, outCGST, outSGST, totalOutputTax,
      itcIGST, itcCGST, itcSGST, totalITC,
      rcmIGST, rcmCGST, rcmSGST, rcmTotal,
      cashIGST, cashCGST, cashSGST, totalCashOp,
      interest, lateFee, penalty, totalCharges,
      // credit ledger
      credOpenIG, credOpenCG, credOpenSG,
      credCloseIG, credCloseCG, credCloseSG,
      // cash ledger
      cashCloseIG, cashCloseCG, cashCloseSG,
      // rcm
      rcmPaidTotal, rcmUnpaid,
      // liability remaining
      liIG, liCG, liSG,
      // carry forward
      carryFwdIG, carryFwdCG, carryFwdSG, carryFwd,
      // totals
      netGSTLiability, totalITCUsed, totalCashUsed,
      finalPayable, excessITC, remCashBal,
      chargesPaid, chargesUnpaid,
      // offset detail
      offset: off,
    };

    _lastData = d;
    _renderResults(d);
    renderAllCharts(d);
    setTimeout(() => $('results').scrollIntoView({ behavior:'smooth', block:'start' }), 120);
    showToast('✅ Calculation complete!', 'ok');
  }, 580);
}

/* ===== RENDER RESULTS ===== */
function _renderResults(d) {
  $('results').classList.add('show');

  // Summary cards
  $('sc1').textContent = f(d.totalOutputTax);
  $('sc2').textContent = f(d.totalITCUsed);
  $('sc3').textContent = f(d.totalCashUsed);
  $('sc4').textContent = f(d.carryFwd);
  $('sc5').textContent = f(d.remCashBal);
  $('sc6').textContent = f(d.rcmTotal);
  $('sc7').textContent = f(d.finalPayable);
  $('sc8').textContent = f(d.excessITC);
  $('sc9').textContent = f(d.netGSTLiability);

  // Credit Ledger closing in ledger card
  if ($('credCloseIG'))    $('credCloseIG').textContent    = f(d.credCloseIG);
  if ($('credCloseCG'))    $('credCloseCG').textContent    = f(d.credCloseCG);
  if ($('credCloseSG'))    $('credCloseSG').textContent    = f(d.credCloseSG);
  if ($('credCloseTotal')) $('credCloseTotal').textContent = f(d.credCloseIG + d.credCloseCG + d.credCloseSG);

  // Cash Ledger closing in ledger card
  if ($('cashCloseIG'))    $('cashCloseIG').textContent    = f(d.cashCloseIG);
  if ($('cashCloseCG'))    $('cashCloseCG').textContent    = f(d.cashCloseCG);
  if ($('cashCloseSG'))    $('cashCloseSG').textContent    = f(d.cashCloseSG);
  if ($('cashCloseTotal')) $('cashCloseTotal').textContent = f(d.cashCloseIG + d.cashCloseCG + d.cashCloseSG);

  // Show closing blocks
  if ($('cashCloseBlock')) $('cashCloseBlock').style.display = 'block';
  if ($('credCloseBlock')) $('credCloseBlock').style.display = 'block';

  // Offset table
  const tb = $('offTbody');
  tb.innerHTML = '';
  const rows = [
    ['IGST ITC',  't-ig', 'IGST Liability','t-ig', d.offset.i2i||0, 'Step 1a'],
    ['IGST ITC',  't-ig', 'CGST Liability','t-cg', d.offset.i2c||0, 'Step 1b'],
    ['IGST ITC',  't-ig', 'SGST Liability','t-sg', d.offset.i2s||0, 'Step 1c'],
    ['CGST ITC',  't-cg', 'CGST Liability','t-cg', d.offset.c2c||0, 'Step 2a'],
    ['CGST ITC',  't-cg', 'IGST Liability','t-ig', d.offset.c2i||0, 'Step 2b'],
    ['SGST ITC',  't-sg', 'SGST Liability','t-sg', d.offset.s2s||0, 'Step 3a'],
    ['SGST ITC',  't-sg', 'IGST Liability','t-ig', d.offset.s2i||0, 'Step 3b'],
    ['Cash IGST', 't-ca', 'IGST Liability','t-ig', d.offset.ci||0,  'Step 4a'],
    ['Cash CGST', 't-ca', 'CGST Liability','t-cg', d.offset.cc||0,  'Step 4b'],
    ['Cash SGST', 't-ca', 'SGST Liability','t-sg', d.offset.cs||0,  'Step 4c'],
    ['Cash',      't-ca', 'RCM IGST',      't-ig', d.offset.ri||0,  'RCM'],
    ['Cash',      't-ca', 'RCM CGST',      't-cg', d.offset.rc||0,  'RCM'],
    ['Cash',      't-ca', 'RCM SGST',      't-sg', d.offset.rs||0,  'RCM'],
  ];
  rows.forEach(([fr,fc,to,tc,amt,step]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><small style="color:var(--muted);font-size:10px">${step}</small></td>
                    <td><span class="tag ${fc}">${fr}</span></td>
                    <td><span class="tag ${tc}">${to}</span></td>
                    <td>${f(amt)}</td>`;
    tb.appendChild(tr);
  });

  // Ledger summary table
  const lb = $('ledgerTbody');
  if (lb) {
    const r = (label, val, type, topBorder=false) => {
      const bold = type==='close';
      const s = `${bold?'font-weight:700;':''}${topBorder?'border-top:2px solid var(--border);':''}`;
      const c = type==='debit'?'color:var(--red)':type==='close'||type==='credit'?'color:var(--green)':'';
      const pre = type==='debit'?'− ':'';
      return `<tr style="${s}"><td>${label}</td><td style="${c}">${pre}${f(val)}</td><td>${
        type==='debit'?'Debited':type==='close'||type==='credit'?'Carry Fwd / Closing':'Opening'}</td></tr>`;
    };
    lb.innerHTML =
      // Credit Ledger
      r('Credit Ledger — IGST Opening (ITC_IGST)', d.credOpenIG, 'open') +
      r('Credit Ledger — CGST Opening (ITC_CGST)', d.credOpenCG, 'open') +
      r('Credit Ledger — SGST Opening (ITC_SGST)', d.credOpenSG, 'open') +
      r('IGST ITC Utilized (→ IGST+CGST+SGST)',    d.offset.i2i+d.offset.i2c+d.offset.i2s, 'debit') +
      r('CGST ITC Utilized (→ CGST+IGST)',          d.offset.c2c+d.offset.c2i, 'debit') +
      r('SGST ITC Utilized (→ SGST+IGST)',          d.offset.s2s+d.offset.s2i, 'debit') +
      r('RCM IGST Paid → Added to IGST Credit',     d.offset.ri||0, 'credit') +
      r('RCM CGST Paid → Added to CGST Credit',     d.offset.rc||0, 'credit') +
      r('RCM SGST Paid → Added to SGST Credit',     d.offset.rs||0, 'credit') +
      r('Credit Ledger IGST — Closing Balance',     d.credCloseIG, 'close', false) +
      r('Credit Ledger CGST — Closing Balance',     d.credCloseCG, 'close', false) +
      r('Credit Ledger SGST — Closing Balance',     d.credCloseSG, 'close', false) +
      // Cash Ledger
      r('Cash Ledger — IGST Deposited Opening',     d.cashIGST, 'open', true) +
      r('Cash Ledger — CGST Deposited Opening',     d.cashCGST, 'open') +
      r('Cash Ledger — SGST Deposited Opening',     d.cashSGST, 'open') +
      r('Cash Used for IGST Liability',             d.offset.ci||0, 'debit') +
      r('Cash Used for CGST Liability',             d.offset.cc||0, 'debit') +
      r('Cash Used for SGST Liability',             d.offset.cs||0, 'debit') +
      r('Cash Used for RCM (IGST+CGST+SGST)',       d.rcmPaidTotal, 'debit') +
      r('Cash Used for Interest + Late Fee + Penalty', d.chargesPaid, 'debit') +
      r('Cash Ledger IGST — Closing Balance',       d.cashCloseIG, 'close', false) +
      r('Cash Ledger CGST — Closing Balance',       d.cashCloseCG, 'close', false) +
      r('Cash Ledger SGST — Closing Balance',       d.cashCloseSG, 'close', false);
  }

  _steps(d);
}

/* ===== VISUAL OFFSET STEPS ===== */
function _steps(d) {
  const row = (label, val, warn=false) => {
    const z = val===0?' z':'';
    const w = warn&&val>0?' neg':'';
    return `<div class="srow"><span>${label}</span><span class="sv${z}${w}">${f(val)}</span></div>`;
  };

  $('s1rows').innerHTML =
    `<div class="srow" style="font-size:11px;color:var(--muted);margin-bottom:4px"><span>Formula: IGST_out = IGST_out − ITC_IGST</span></div>` +
    row('ITC_IGST → IGST Liability',              d.offset.i2i||0) +
    row('Remaining ITC_IGST → CGST Liability',    d.offset.i2c||0) +
    row('Remaining ITC_IGST → SGST Liability',    d.offset.i2s||0) +
    row('IGST ITC — Carry Forward',               d.carryFwdIG);

  $('s2rows').innerHTML =
    `<div class="srow" style="font-size:11px;color:var(--muted);margin-bottom:4px"><span>Formula: CGST_out = CGST_out − ITC_CGST | ITC_CGST ↛ SGST</span></div>` +
    row('ITC_CGST → CGST Liability',              d.offset.c2c||0) +
    row('Remaining ITC_CGST → IGST Liability',    d.offset.c2i||0) +
    row('CGST ITC — Carry Forward',               d.carryFwdCG) +
    `<div class="srow" style="font-size:11px;color:var(--orange);font-weight:600"><span>⛔ ITC_CGST ↛ SGST — Not Allowed</span><span>Rule</span></div>`;

  $('s3rows').innerHTML =
    `<div class="srow" style="font-size:11px;color:var(--muted);margin-bottom:4px"><span>Formula: SGST_out = SGST_out − ITC_SGST | ITC_SGST ↛ CGST</span></div>` +
    row('ITC_SGST → SGST Liability',              d.offset.s2s||0) +
    row('Remaining ITC_SGST → IGST Liability',    d.offset.s2i||0) +
    row('SGST ITC — Carry Forward',               d.carryFwdSG) +
    `<div class="srow" style="font-size:11px;color:var(--orange);font-weight:600"><span>⛔ ITC_SGST ↛ CGST — Not Allowed</span><span>Rule</span></div>`;

  $('s4rows').innerHTML =
    `<div class="srow" style="font-size:11px;color:var(--muted);margin-bottom:4px"><span>Remaining Liability = Output Liability − Utilized ITC</span></div>` +
    row('Cash IGST → IGST Liability',             d.offset.ci||0) +
    row('Cash CGST → CGST Liability',             d.offset.cc||0) +
    row('Cash SGST → SGST Liability',             d.offset.cs||0) +
    row('Cash → RCM IGST (RCM ↛ Credit Ledger)', d.offset.ri||0) +
    row('Cash → RCM CGST (RCM ↛ Credit Ledger)', d.offset.rc||0) +
    row('Cash → RCM SGST (RCM ↛ Credit Ledger)', d.offset.rs||0) +
    row('Cash → Interest',                         d.interest) +
    row('Cash → Late Fee',                         d.lateFee) +
    row('Cash → Penalty',                          d.penalty) +
    `<div style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px">` +
    row('⚠ IGST Still Unpaid',  d.liIG,      true) +
    row('⚠ CGST Still Unpaid',  d.liCG,      true) +
    row('⚠ SGST Still Unpaid',  d.liSG,      true) +
    row('⚠ RCM Still Unpaid',   d.rcmUnpaid, true) +
    `</div>`;
}

/* ===== RESET ===== */
function resetAll() {
  document.querySelectorAll('input[type=number]').forEach(i => i.value = '');
  liveTotals();
  $('results').classList.remove('show');
  if ($('cashCloseBlock')) $('cashCloseBlock').style.display = 'none';
  if ($('credCloseBlock')) $('credCloseBlock').style.display = 'none';
  _lastData = null;
  showToast('🔄 Reset done', 'inf');
}

/* ===== COMPANY DATA ===== */
function getCompany() {
  return {
    name:  $('inp_company').value || 'N/A',
    gst:   $('inp_gst').value     || 'N/A',
    fy:    $('inp_fy').value      || 'N/A',
    month: $('sel_month').value   || 'N/A',
    date:  $('inp_date').value    || new Date().toLocaleDateString('en-IN'),
  };
}

/* ===== EXPORT HANDLERS ===== */
function hPDF()   { if(!_lastData){showAlert('No Data','Calculate first.','📊');return;} exportPDF(_lastData,getCompany()); }
function hCSV()   { if(!_lastData){showAlert('No Data','Calculate first.','📊');return;} exportCSV(_lastData,getCompany()); }
function hExcel() { if(!_lastData){showAlert('No Data','Calculate first.','📊');return;} exportExcel(_lastData,getCompany()); }
function hPrint() { if(!_lastData){showAlert('No Data','Calculate first.','📊');return;} window.print(); }

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  $('inp_date').value = new Date().toISOString().split('T')[0];

  document.querySelectorAll('input[type=number]').forEach(i => {
    i.addEventListener('input', liveTotals);
    i.addEventListener('keydown', e => { if(e.key==='-') e.preventDefault(); });
  });

  $('sel_month').addEventListener('change', updateBadge);
  $('inp_fy').addEventListener('input', updateBadge);
  document.querySelectorAll('.tbtn').forEach(b => {
    b.addEventListener('click', () => setTheme(b.dataset.t));
  });
  $('aOverlay').addEventListener('click', e => { if(e.target===$('aOverlay')) closeAlert(); });

  liveTotals();
  updateBadge();
});

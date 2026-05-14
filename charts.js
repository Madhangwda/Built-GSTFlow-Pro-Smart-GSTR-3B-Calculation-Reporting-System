// ===== GSTFlow Pro — charts.js =====
'use strict';

const _charts = {};

function _destroy(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

function renderAllCharts(d) {
  _renderLiabilityBar(d);
  _renderITCDoughnut(d);
  _renderCashBar(d);
  _renderRadar(d);
  _renderStackedCredit(d);
}

function _renderLiabilityBar(d) {
  _destroy('ch1');
  const ctx = document.getElementById('ch1').getContext('2d');
  _charts['ch1'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['IGST', 'CGST', 'SGST', 'Total'],
      datasets: [
        { label: 'Tax Liability', data: [d.outIGST, d.outCGST, d.outSGST, d.totalLiability], backgroundColor: ['rgba(42,92,255,.8)','rgba(124,58,237,.8)','rgba(13,148,136,.8)','rgba(220,38,38,.75)'], borderRadius: 7 },
        { label: 'ITC Available', data: [d.itcIGST, d.itcCGST, d.itcSGST, d.totalITC], backgroundColor: ['rgba(42,92,255,.22)','rgba(124,58,237,.22)','rgba(13,148,136,.22)','rgba(220,38,38,.22)'], borderRadius: 7 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + Number(v).toLocaleString('en-IN') } } } }
  });
}

function _renderITCDoughnut(d) {
  _destroy('ch2');
  const ctx = document.getElementById('ch2').getContext('2d');
  const i2i = d.offset.i2i||0, i2c = d.offset.i2c||0, i2s = d.offset.i2s||0;
  const c2c = d.offset.c2c||0, c2i = d.offset.c2i||0;
  const s2s = d.offset.s2s||0, s2i = d.offset.s2i||0;
  const cf = Math.max(0, d.totalITC - i2i - i2c - i2s - c2c - c2i - s2s - s2i);
  _charts['ch2'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['IGST→IGST','IGST→CGST','IGST→SGST','CGST→CGST','CGST→IGST','SGST→SGST','SGST→IGST','Carry Forward'],
      datasets: [{ data: [i2i,i2c,i2s,c2c,c2i,s2s,s2i,cf], backgroundColor: ['#2a5cff','#7c3aed','#0d9488','#d97706','#f59e0b','#059669','#34d399','#cbd5e1'], borderWidth: 3, borderColor: 'transparent' }]
    },
    options: { responsive: true, cutout: '64%', plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } } } }
  });
}

function _renderCashBar(d) {
  _destroy('ch3');
  const ctx = document.getElementById('ch3').getContext('2d');
  _charts['ch3'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['IGST', 'CGST', 'SGST'],
      datasets: [
        { label: 'Cash Available', data: [d.cashIGST, d.cashCGST, d.cashSGST], backgroundColor: 'rgba(5,150,105,.75)', borderRadius: 7 },
        { label: 'Cash Used', data: [d.offset.ci||0, d.offset.cc||0, d.offset.cs||0], backgroundColor: 'rgba(220,38,38,.75)', borderRadius: 7 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + Number(v).toLocaleString('en-IN') } } } }
  });
}

function _renderRadar(d) {
  _destroy('ch4');
  const ctx = document.getElementById('ch4').getContext('2d');
  _charts['ch4'] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Out IGST','Out CGST','Out SGST','ITC IGST','ITC CGST','ITC SGST'],
      datasets: [{
        label: 'GST Overview', pointBackgroundColor: '#2a5cff', borderColor: '#2a5cff',
        backgroundColor: 'rgba(42,92,255,.12)', borderWidth: 2,
        data: [d.outIGST, d.outCGST, d.outSGST, d.itcIGST, d.itcCGST, d.itcSGST]
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function _renderStackedCredit(d) {
  _destroy('ch5');
  const ctx = document.getElementById('ch5').getContext('2d');
  const ui = (d.offset.i2i||0)+(d.offset.i2c||0)+(d.offset.i2s||0);
  const uc = (d.offset.c2c||0)+(d.offset.c2i||0);
  const us = (d.offset.s2s||0)+(d.offset.s2i||0);
  const ci = Math.max(0, d.itcIGST - ui);
  const cc = Math.max(0, d.itcCGST - uc);
  const cs = Math.max(0, d.itcSGST - us);
  _charts['ch5'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['IGST Credit','CGST Credit','SGST Credit'],
      datasets: [
        { label: 'Utilized', data: [ui,uc,us], backgroundColor: ['rgba(42,92,255,.8)','rgba(124,58,237,.8)','rgba(13,148,136,.8)'], borderRadius: 7, stack: 'a' },
        { label: 'Carry Forward', data: [ci,cc,cs], backgroundColor: ['rgba(42,92,255,.2)','rgba(124,58,237,.2)','rgba(13,148,136,.2)'], borderRadius: 7, stack: 'a' }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: v => '₹' + Number(v).toLocaleString('en-IN') } } } }
  });
}

/* Route Command — success-screen / history details, rendered from stored data (never stored as HTML) */
import { esc, fmtDate } from './util.js';

const rows = (items, row) => items.map(row).join('');

/* data shapes: Receipt {amount, category, date, vehicle, photo}, Credit {store, date, items}, Donation {items} */
export function summaryHTML(type, d) {
  if (type === 'Receipt') {
    const veh = d.vehicle && d.vehicle !== 'N/A' ? ` · ${d.vehicle}` : '';
    return `<div class="credit-success-meta">$${parseFloat(d.amount).toFixed(2)} &middot; ${esc(d.category)}</div>
        <div class="credit-success-item"><span class="credit-success-item__product">${fmtDate(d.date)}${esc(veh)}</span>
        <span class="credit-success-item__reason">${d.photo ? 'Photo attached' : 'No photo'}</span></div>`;
  }
  if (type === 'Credit') {
    return `<div class="credit-success-meta">${esc(d.store)} &middot; ${fmtDate(d.date)}</div>` + rows(d.items, item => `
    <div class="credit-success-item">
      <span class="credit-success-item__type">${esc(item.type)}</span>
      <span class="credit-success-item__product">${esc(item.product)}</span>
      <span class="credit-success-item__qty">${esc(item.qty)}</span>
      <span class="credit-success-item__reason">${esc(item.reason)}</span>
    </div>`);
  }
  return rows(d.items, item => `
    <div class="credit-success-item">
      <span class="credit-success-item__type">${esc(item.type)}</span>
      <span class="credit-success-item__product">${esc([item.upc, item.name || '—'].filter(Boolean).join(' — '))}</span>
      <span class="credit-success-item__qty">x${item.qty} &middot; ${fmtDate(item.sellBy)}</span>
      <span class="credit-success-item__reason">${esc(item.reason)}</span>
    </div>`);
}

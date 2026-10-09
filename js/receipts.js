/* Route Command — receipt form and photo */
import { $, esc, fmtDate, today, getName, submitLabel, markInvalid, focusFirstInvalid, confirmDialog } from './util.js';
import { submitForm } from './submit.js';

const expenseForm       = document.getElementById('expense-form');
const submitBtn         = document.getElementById('submit-btn');
const successState      = document.getElementById('success-state');
const submitAnotherBtn  = document.getElementById('submit-another-btn');
const receiptPhotoInput = document.getElementById('receipt-photo');

/* Stores compressed image as base64 */
let compressedImageData = null;

/* Block submit while a photo is still compressing, so it can't be sent without it */
function setPhotoBusy(busy) {
  submitBtn.disabled    = busy;
  submitBtn.textContent = busy ? 'Processing photo…' : submitLabel(submitBtn);
}

function handleImageUpload(file) {
  if (!file) return;

  const MAX_WIDTH = 1024;
  const QUALITY   = 0.7;

  setPhotoBusy(true);
  const reader = new FileReader();
  reader.onerror = () => setPhotoBusy(false);
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width  = MAX_WIDTH;
      }

      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      compressedImageData = canvas.toDataURL('image/jpeg', QUALITY);

      showPhotoPreview(compressedImageData);
      setPhotoBusy(false);
    };
    img.onerror = () => setPhotoBusy(false);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

const photoActions = document.querySelector('.photo-actions');
const photoPreview = document.getElementById('photo-preview');

const photoDialog = document.getElementById('photo-dialog');
document.getElementById('photo-thumb').addEventListener('click', (e) => {
  document.getElementById('photo-full').src = e.target.src;
  photoDialog.showModal();
});
photoDialog.addEventListener('click', () => photoDialog.close());

function showPhotoPreview(src) {
  document.getElementById('photo-thumb').src = src || '';
  photoPreview.classList.toggle('hidden', !src);
  photoActions.classList.toggle('hidden', !!src);
}

/* Camera and library inputs both feed the same handler */
[receiptPhotoInput, document.getElementById('receipt-library')].forEach(input => {
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  });
});

document.getElementById('photo-retake').addEventListener('click', () => {
  compressedImageData = null;
  showPhotoPreview(null);
});

/* Vehicle Tag only matters for these categories */
const VEHICLE_CATEGORIES = ['Fuel', 'Vehicle Maintenance', 'Tolls / Parking'];
function syncVehicleField() {
  $('vehicle-group').classList.toggle('hidden', !VEHICLE_CATEGORIES.includes($('expense-category').value));
}
$('expense-category').addEventListener('change', syncVehicleField);

if (expenseForm) {
  expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = getName();
    const date     = document.getElementById('receipt-date').value;
    const category = document.getElementById('expense-category').value;
    const amount   = document.getElementById('expense-amount').value;
    /* The vehicle field is hidden for categories that don't involve a vehicle */
    const vehicle  = $('vehicle-group').classList.contains('hidden') ? 'N/A' : $('vehicle-tag').value;
    const notes    = document.getElementById('notes').value;

    let valid = true;
    if (!date)                     valid = markInvalid($('receipt-date'), 'Enter the date on the receipt');
    if (!category)                 valid = markInvalid($('expense-category'), 'Choose a category');
    if (!(parseFloat(amount) > 0)) valid = markInvalid($('expense-amount'), 'Enter an amount above $0');
    if (!name || !valid) { focusFirstInvalid(expenseForm); return; }

    /* Unusual dates are usually typos */
    const ageDays = (Date.parse(today()) - Date.parse(date)) / 864e5;
    if (ageDays < 0  && !await confirmDialog('This receipt is dated in the future. Submit anyway?', 'Submit anyway')) return;
    if (ageDays > 60 && !await confirmDialog(`This receipt is ${Math.round(ageDays)} days old. Submit anyway?`, 'Submit anyway')) return;

    if (!compressedImageData && !await confirmDialog('No receipt photo attached. Submit anyway?', 'Submit anyway')) return;

    const photoNote = compressedImageData ? 'Photo attached' : 'No photo';
    const veh       = vehicle && vehicle !== 'N/A' ? ` · ${vehicle}` : '';
    submitForm({
      endpoint:    '/api/submit-receipt',
      payload:     { employeeName: name, receiptDate: date, category, amount, vehicleTag: vehicle, notes,
                     imageData: compressedImageData || null, timestamp: new Date().toISOString() },
      btn:         submitBtn,
      type:        'Receipt',
      histLabel:   `$${parseFloat(amount).toFixed(2)} · ${category}`,
      formEl:      expenseForm,
      successEl:   successState,
      summaryEl:   document.getElementById('receipt-success-summary'),
      summaryHTML: `<div class="credit-success-meta">$${parseFloat(amount).toFixed(2)} &middot; ${esc(category)}</div>
        <div class="credit-success-item"><span class="credit-success-item__product">${fmtDate(date)}${esc(veh)}</span>
        <span class="credit-success-item__reason">${photoNote}</span></div>`,
    });
  });
}

/* Submit Another */
if (submitAnotherBtn) {
  submitAnotherBtn.addEventListener('click', () => {
    expenseForm.reset();
    compressedImageData = null;

    showPhotoPreview(null);
    syncVehicleField();

    successState.classList.add('hidden');
    expenseForm.classList.remove('hidden');
  });
}

/**
 * Route Command — CreditCode.gs
 * Google Apps Script backend for the Credit Submission feature.
 *
 * SETUP STEPS:
 *  1. Go to script.google.com and create a NEW project (separate from Code.gs).
 *  2. Paste this entire file into the editor.
 *  3. Create a new Google Sheet and copy its ID from the URL (the long string between
 *     /d/ and /edit). In Project Settings → Script properties, add CREDIT_SHEET_ID = that ID.
 *     If a deployed copy already exists, copy the ID out of its source first, then set the property.
 *  4. Deploy as a Web App:
 *       Execute as: Me (your Google account)
 *       Who has access: Anyone
 *  5. Copy the Web App URL into the Netlify environment variable GAS_URL_CREDIT.
 *
 * The sheet will auto-create a header row on the first submission.
 * Ian can manually tick the "Done" column as he processes each credit.
 */

/* IDs live in Script Properties (Project Settings → Script properties), not in this file,
   so pasting a new copy of the code never overwrites them. */
function getProp_(name) {
  var v = PropertiesService.getScriptProperties().getProperty(name);
  if (!v) throw new Error('Script property ' + name + ' is not set');
  return v;
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Route Command Credits API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost — receives JSON from the frontend.
 *
 * Expected payload shape:
 * {
 *   salesperson : string,
 *   store       : string,
 *   date        : string  (YYYY-MM-DD),
 *   notes       : string,
 *   timestamp   : string  (ISO 8601),
 *   items: [
 *     {
 *       type    : string  ("Retail" | "Chub / Deli"),
 *       product : string  (UPC/item# or product name),
 *       qty     : string  ("5 units" | "7.63 lbs"),
 *       reason  : string  ("10-Day" | "Expired" | etc.),
 *     },
 *     ...
 *   ]
 * }
 *
 * One row is written per credit line item so Ian can check off each
 * one individually in the "Done" column.
 */
function doPost(e) {
  /* One request at a time: no double header rows, and no race between the duplicate check and the write */
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return buildResponse({ status: 'error', message: 'Server busy, try again.' });
  }
  try {
    return handlePost_(e);
  } finally {
    lock.releaseLock();
  }
}

/* Column that holds the client's submissionId (hidden); retries of a saved submission are ignored */
var ID_COL = 11;

function handlePost_(e) {
  try {
    var payload     = JSON.parse(e.postData.contents);
    var salesperson = sanitize(payload.salesperson || '');
    var store       = sanitize(payload.store       || '');
    var date        = sanitize(payload.date        || '');
    var notes       = sanitize(payload.notes       || '');
    var timestamp   = payload.timestamp || new Date().toISOString();
    var items       = payload.items || [];
    var submissionId = sanitize(payload.submissionId || '');

    var sheet = SpreadsheetApp.openById(getProp_('CREDIT_SHEET_ID')).getActiveSheet();

    /* Auto-create header row */
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Salesperson',
        'Store',
        'Date',
        'Product Type',
        'Product',
        'Qty / Weight',
        'Reason',
        'Notes',
        'Done'
      ]);
      var headerRange = sheet.getRange(1, 1, 1, 10);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1a1a1a');
      headerRange.setFontColor('#ffffff');
    }
    ensureIdColumn_(sheet, ID_COL);

    /* A retry after a lost response must not add the credits twice */
    if (alreadySaved_(sheet, ID_COL, submissionId)) {
      return buildResponse({ status: 'success', message: 'Credits were already submitted.', duplicate: true });
    }

    /* One row per credit line item, written in a single call so a submission is all-or-nothing */
    var rows = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      rows.push([
        timestamp,
        salesperson,
        store,
        date,
        sanitize(item.type    || ''),
        sanitize(item.product || ''),
        sanitize(item.qty     || ''),
        sanitize(item.reason  || ''),
        notes,
        '',
        submissionId
      ]);
    }
    if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ID_COL).setValues(rows);

    return buildResponse({
      status:  'success',
      message: 'Credits submitted successfully.',
      count:   items.length
    });

  } catch (err) {
    return buildResponse({
      status:  'error',
      message: err.message || 'An unexpected error occurred on the server.'
    });
  }
}

/* Header + hidden column for the submissionId; also upgrades sheets created before it existed */
function ensureIdColumn_(sheet, col) {
  if (sheet.getRange(1, col).getValue()) return;
  sheet.getRange(1, col).setValue('Submission ID').setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#ffffff');
  sheet.hideColumns(col);
}

/* True if this submissionId is already in the sheet. Only the newest 2000 rows are checked (retries are recent). */
function alreadySaved_(sheet, col, id) {
  var last = sheet.getLastRow();
  if (!id || last < 2) return false;
  var first = Math.max(2, last - 1999);
  var ids = sheet.getRange(first, col, last - first + 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return true;
  return false;
}

function buildResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, 500);
}

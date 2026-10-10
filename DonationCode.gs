/**
 * Route Command — DonationCode.gs
 * Google Apps Script backend for the Donation Logging feature.
 *
 * SETUP STEPS:
 *  1. Go to script.google.com and create a NEW project (separate from Code.gs and CreditCode.gs).
 *  2. Paste this entire file into the editor.
 *  3. Create a new Google Sheet and copy its ID from the URL into DONATION_SHEET_ID below.
 *     (The Sheet ID is the long string between /d/ and /edit in the URL.)
 *  4. Deploy as a Web App:
 *       Execute as: Me (your Google account)
 *       Who has access: Anyone
 *  5. Copy the Web App URL into the Netlify environment variable GAS_URL_DONATION.
 *
 * The sheet will auto-create a header row on the first submission.
 * One row is written per donation item.
 */

var DONATION_SHEET_ID = '1AQ-CrU7X6Aev80xYCsXPKidRWg5Ov1FvLq1deJsQVa0';

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Route Command Donations API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost — receives JSON from the frontend.
 *
 * Expected payload:
 * {
 *   employee  : string,
 *   notes     : string,
 *   timestamp : string  (ISO 8601),
 *   items: [
 *     {
 *       type   : string  ("Chub" | "Retail"),
 *       upc    : string,
 *       name   : string,
 *       qty    : number,
 *       sellBy : string  (YYYY-MM-DD),
 *       reason : string,
 *     }
 *   ]
 * }
 *
 * One row per donation item is written so each can be tracked individually.
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
var ID_COL = 10;

function handlePost_(e) {
  try {
    var payload   = JSON.parse(e.postData.contents);
    var employee  = sanitize(payload.employee  || '');
    var notes     = sanitize(payload.notes     || '');
    var timestamp = payload.timestamp || new Date().toISOString();
    var items     = payload.items || [];
    var submissionId = sanitize(payload.submissionId || '');

    var sheet = SpreadsheetApp.openById(DONATION_SHEET_ID).getActiveSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Employee',
        'Item Type',
        'UPC',
        'Item Name',
        'Qty',
        'Sell-By Date',
        'Reason',
        'Notes',
      ]);
      var headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1a1a1a');
      headerRange.setFontColor('#ffffff');
    }
    ensureIdColumn_(sheet, ID_COL);

    /* A retry after a lost response must not log the donation twice */
    if (alreadySaved_(sheet, ID_COL, submissionId)) {
      return buildResponse({ status: 'success', message: 'Donation log was already submitted.', duplicate: true });
    }

    /* Written in a single call so a submission is all-or-nothing */
    var rows = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      rows.push([
        timestamp,
        employee,
        sanitize(item.type   || ''),
        sanitize(item.upc    || ''),
        sanitize(item.name   || ''),
        item.qty || 1,
        sanitize(item.sellBy || ''),
        sanitize(item.reason || ''),
        notes,
        submissionId,
      ]);
    }
    if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ID_COL).setValues(rows);

    return buildResponse({
      status:  'success',
      message: 'Donation log submitted successfully.',
      count:   items.length,
    });

  } catch (err) {
    return buildResponse({
      status:  'error',
      message: err.message || 'An unexpected error occurred on the server.',
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

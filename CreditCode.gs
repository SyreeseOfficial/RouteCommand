/**
 * Route Command — CreditCode.gs
 * Google Apps Script backend for the Credit Submission feature.
 *
 * SETUP STEPS:
 *  1. Go to script.google.com and create a NEW project (separate from Code.gs).
 *  2. Paste this entire file into the editor.
 *  3. Create a new Google Sheet and copy its ID from the URL into CREDIT_SHEET_ID below.
 *     (The Sheet ID is the long string between /d/ and /edit in the URL.)
 *  4. Deploy as a Web App:
 *       Execute as: Me (your Google account)
 *       Who has access: Anyone
 *  5. Copy the Web App URL and paste it into netlify/functions/submit-credit.mjs
 *     where GAS_URL is defined.
 *
 * The sheet will auto-create a header row on the first submission.
 * Ian can manually tick the "Done" column as he processes each credit.
 */

var CREDIT_SHEET_ID = 'PASTE_YOUR_CREDIT_SHEET_ID_HERE';

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
  try {
    var payload     = JSON.parse(e.postData.contents);
    var salesperson = sanitize(payload.salesperson || '');
    var store       = sanitize(payload.store       || '');
    var date        = sanitize(payload.date        || '');
    var notes       = sanitize(payload.notes       || '');
    var timestamp   = payload.timestamp || new Date().toISOString();
    var items       = payload.items || [];

    var sheet = SpreadsheetApp.openById(CREDIT_SHEET_ID).getActiveSheet();

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

    /* One row per credit line item */
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      sheet.appendRow([
        timestamp,
        salesperson,
        store,
        date,
        sanitize(item.type    || ''),
        sanitize(item.product || ''),
        sanitize(item.qty     || ''),
        sanitize(item.reason  || ''),
        notes,
        ''
      ]);
    }

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

function buildResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, 500);
}

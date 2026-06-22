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
 *  5. Copy the Web App URL and paste it into netlify/functions/submit-donation.mjs
 *     where GAS_URL is defined.
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
  try {
    var payload   = JSON.parse(e.postData.contents);
    var employee  = sanitize(payload.employee  || '');
    var notes     = sanitize(payload.notes     || '');
    var timestamp = payload.timestamp || new Date().toISOString();
    var items     = payload.items || [];

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

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      sheet.appendRow([
        timestamp,
        employee,
        sanitize(item.type   || ''),
        sanitize(item.upc    || ''),
        sanitize(item.name   || ''),
        item.qty || 1,
        sanitize(item.sellBy || ''),
        sanitize(item.reason || ''),
        notes,
      ]);
    }

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

function buildResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, 500);
}

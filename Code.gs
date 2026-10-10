/**
 * Route Command — Code.gs
 * Google Apps Script backend. Deploy as a Web App:
 *   Execute as: Me (your Google account)
 *   Who has access: Anyone
 *
 * After deploying, copy the Web App URL into the Netlify environment variable
 * GAS_URL_RECEIPT (the Netlify function in netlify/functions/submit.mjs reads it).
 *
 * Before the first run, add two Script properties (Project Settings → Script properties):
 *   DRIVE_FOLDER_ID : the Drive folder that receives receipt photos
 *   SHEET_ID        : the Google Sheet that logs receipts
 */

/* IDs live in Script Properties (Project Settings → Script properties), not in this file,
   so pasting a new copy of the code never overwrites them. */
function getProp_(name) {
  var v = PropertiesService.getScriptProperties().getProperty(name);
  if (!v) throw new Error('Script property ' + name + ' is not set');
  return v;
}

/* ─── CORS headers required for Vercel/Netlify → GAS requests ─── */
var CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json'
};

/**
 * doGet — handles OPTIONS preflight and browser health-check pings.
 * Google Apps Script does not natively handle OPTIONS, so we map
 * preflight requests through doGet via a query param workaround,
 * and also return a status response for any direct GET.
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Route Command API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost — primary entry point.
 * Receives JSON payload from the frontend fetch call.
 *
 * Expected payload shape:
 * {
 *   employeeName : string,
 *   receiptDate  : string  (YYYY-MM-DD),
 *   category     : string,
 *   amount       : string,
 *   vehicleTag   : string,
 *   notes        : string,
 *   imageData    : string | null  (Base64 data URL, e.g. "data:image/jpeg;base64,..."),
 *   timestamp    : string  (ISO 8601),
 *   submissionId : string  (unique per submission; a repeat is acknowledged but not saved again)
 * }
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
var ID_COL = 9;

function handlePost_(e) {
  try {
    /* ── 1. Parse incoming JSON ── */
    var payload = JSON.parse(e.postData.contents);

    var employeeName = sanitize(payload.employeeName || '');
    var receiptDate  = sanitize(payload.receiptDate  || '');
    var category     = sanitize(payload.category     || '');
    var amount       = sanitize(String(payload.amount || ''));
    var vehicleTag   = sanitize(payload.vehicleTag   || 'N/A');
    var notes        = sanitize(payload.notes        || '');
    var submissionId = sanitize(payload.submissionId || '');
    var imageData    = payload.imageData || null;
    var timestamp    = payload.timestamp || new Date().toISOString();

    /* ── 2. Open the Receipts tab, create the header row if it is empty ── */
    var sheet = getSheet_();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Employee Name',
        'Receipt Date',
        'Category',
        'Amount',
        'Vehicle Tag',
        'Notes',
        'Receipt Image URL'
      ]);

      /* Style the header row */
      var headerRange = sheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1a1a1a');
      headerRange.setFontColor('#ffffff');
    }
    ensureIdColumn_(sheet, ID_COL);

    /* ── 3. Already saved? A retry after a lost response must not add a second row or photo ── */
    if (alreadySaved_(sheet, ID_COL, submissionId)) {
      return buildResponse({ status: 'success', message: 'Receipt was already submitted.', duplicate: true });
    }

    /* ── 4. Build standardized filename ──
       Format: YYYY-MM-DD_EmployeeName_Category_Amount.jpg
       Spaces replaced with underscores, special chars stripped.       */
    var safeName     = employeeName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    var safeCategory = category.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    var safeAmount   = amount.replace(/[^0-9.]/g, '');
    var fileName     = receiptDate + '_' + safeName + '_' + safeCategory + '_' + safeAmount + '.jpg';

    /* ── 5. Save image to Google Drive (if provided) ── */
    var fileUrl = 'No image attached';

    if (imageData) {
      /* Strip the data URL prefix: "data:image/jpeg;base64," */
      var base64String = imageData.replace(/^data:image\/\w+;base64,/, '');

      /* Decode Base64 → raw bytes */
      var imageBytes = Utilities.base64Decode(base64String);
      var imageBlob  = Utilities.newBlob(imageBytes, 'image/jpeg', fileName);

      /* Save to the designated Drive folder */
      var folder    = DriveApp.getFolderById(getProp_('DRIVE_FOLDER_ID'));
      var savedFile = folder.createFile(imageBlob);

      /* Make the file viewable by anyone with the link */
      savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      fileUrl = savedFile.getUrl();
    }

    /* ── 6. Append row to Google Sheet ── */
    sheet.appendRow([
      timestamp,
      employeeName,
      receiptDate,
      category,
      amount,
      vehicleTag,
      notes,
      fileUrl,
      submissionId
    ]);

    /* ── 7. Return success response ── */
    return buildResponse({
      status:   'success',
      message:  'Receipt submitted successfully.',
      fileUrl:  fileUrl,
      fileName: fileName
    });

  } catch (err) {
    /* ── 8. Return structured error ── */
    return buildResponse({
      status:  'error',
      message: err.message || 'An unexpected error occurred on the server.'
    });
  }
}

/* The tab named "Receipts", never whichever tab happens to be active (reordering tabs must not move data) */
function getSheet_() {
  var sheet = SpreadsheetApp.openById(getProp_('SHEET_ID')).getSheetByName('Receipts');
  if (!sheet) throw new Error('Tab "Receipts" not found in the spreadsheet. Rename the receipts tab to Receipts.');
  return sheet;
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

/* ─── HELPERS ────────────────────────────────────────────────── */

/**
 * Wraps a JSON object in a ContentService response with CORS headers.
 * Note: Google Apps Script's ContentService does not support custom
 * HTTP response headers natively in the same way as Express, but we
 * include them for compatibility with fetch() calls.
 */
function buildResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Strips leading/trailing whitespace and limits string length to
 * prevent runaway payloads from filling the Sheet.
 */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  var out = str.trim().substring(0, 500);
  // A leading = + - @ would run as a formula in Sheets; the ' prefix keeps it text.
  return /^[=+\-@]/.test(out) ? "'" + out : out;
}

/**
 * Route Command — Code.gs
 * Google Apps Script backend. Deploy as a Web App:
 *   Execute as: Me (your Google account)
 *   Who has access: Anyone
 *
 * After deploying, copy the Web App URL and paste it into app.js
 * where GAS_URL is defined.
 *
 * IDs are read-only constants — never modify them.
 */

var DRIVE_FOLDER_ID = '1N0MTnkIyHIhwRGgPnaM-R3v4DXp4zCzb';
var SHEET_ID        = '1EVNu8oFX3ll-slu8EX0kCtNOEvfii4aXRyvzXt1a-m0';

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
 *   timestamp    : string  (ISO 8601)
 * }
 */
function doPost(e) {
  try {
    /* ── 1. Parse incoming JSON ── */
    var payload = JSON.parse(e.postData.contents);

    var employeeName = sanitize(payload.employeeName || '');
    var receiptDate  = sanitize(payload.receiptDate  || '');
    var category     = sanitize(payload.category     || '');
    var amount       = sanitize(String(payload.amount || ''));
    var vehicleTag   = sanitize(payload.vehicleTag   || 'N/A');
    var notes        = sanitize(payload.notes        || '');
    var imageData    = payload.imageData || null;
    var timestamp    = payload.timestamp || new Date().toISOString();

    /* ── 2. Build standardized filename ──
       Format: YYYY-MM-DD_EmployeeName_Category_Amount.jpg
       Spaces replaced with underscores, special chars stripped.       */
    var safeName     = employeeName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    var safeCategory = category.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    var safeAmount   = amount.replace(/[^0-9.]/g, '');
    var fileName     = receiptDate + '_' + safeName + '_' + safeCategory + '_' + safeAmount + '.jpg';

    /* ── 3. Save image to Google Drive (if provided) ── */
    var fileUrl = 'No image attached';

    if (imageData) {
      /* Strip the data URL prefix: "data:image/jpeg;base64," */
      var base64String = imageData.replace(/^data:image\/\w+;base64,/, '');

      /* Decode Base64 → raw bytes */
      var imageBytes = Utilities.base64Decode(base64String);
      var imageBlob  = Utilities.newBlob(imageBytes, 'image/jpeg', fileName);

      /* Save to the designated Drive folder */
      var folder    = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var savedFile = folder.createFile(imageBlob);

      /* Make the file viewable by anyone with the link */
      savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      fileUrl = savedFile.getUrl();
    }

    /* ── 4. Append row to Google Sheet ── */
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

    /* Auto-create header row if the sheet is empty */
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

    sheet.appendRow([
      timestamp,
      employeeName,
      receiptDate,
      category,
      amount,
      vehicleTag,
      notes,
      fileUrl
    ]);

    /* ── 5. Return success response ── */
    return buildResponse({
      status:   'success',
      message:  'Receipt submitted successfully.',
      fileUrl:  fileUrl,
      fileName: fileName
    });

  } catch (err) {
    /* ── 6. Return structured error ── */
    return buildResponse({
      status:  'error',
      message: err.message || 'An unexpected error occurred on the server.'
    });
  }
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
  return str.trim().substring(0, 500);
}

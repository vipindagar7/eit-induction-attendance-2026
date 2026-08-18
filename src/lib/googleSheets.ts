import { google } from "googleapis";
import { IAttendance } from "@/models/Attendance";

// Uses a Google service account to append rows to a Sheet only you own.
// Setup (one-time):
//   1. Go to console.cloud.google.com -> create a project (or reuse one).
//   2. Enable the "Google Sheets API".
//   3. Create a Service Account -> generate a JSON key -> download it.
//   4. Put the JSON file at the path in GOOGLE_SERVICE_ACCOUNT_KEY_PATH
//      (or paste its contents into GOOGLE_SERVICE_ACCOUNT_KEY as a one-line JSON string).
//   5. Open your Google Sheet -> Share -> add the service account's
//      "client_email" (looks like xxx@xxx.iam.gserviceaccount.com) as an Editor.
//      This is what lets the app write to it while the sheet itself stays
//      private to you (the service account is not a public share).
//   6. Copy the Sheet ID from its URL into GOOGLE_SHEET_ID.
//      https://docs.google.com/spreadsheets/d/<THIS_PART>/edit

const SHEET_ID = process.env.GOOGLE_SHEET_ID as string;
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Attendance";
const HEADER = [git remote add origin https://github.com/vipindagar7/eit-induction-attendance.git];

function getCredentials() {
  const inlineKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (inlineKey) {
    return JSON.parse(inlineKey);
  }

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    return JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  }

  throw new Error(
    "No Google service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_KEY in .env.local."
  );
}

async function getSheetsClient() {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  // @ts-expect-error - googleapis typing quirk between GoogleAuth client and sheets client
  return google.sheets({ version: "v4", auth: client });
}

let headerEnsured = false;

async function ensureHeaderRow() {
  if (headerEnsured) return;
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A1:F1`,
  });

  const hasHeader = res.data.values && res.data.values.length > 0;

  if (!hasHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1:F1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER] },
    });
  }

  headerEnsured = true;
}

async function getNextSerialNumber(): Promise<number> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:A`,
  });

  const rows = res.data.values || [];
  // rows[0] is the header, so number of data rows = rows.length - 1 (if header exists)
  const dataRowCount = Math.max(rows.length - 1, 0);
  return dataRowCount + 1;
}

export async function appendAttendanceToSheet(record: IAttendance) {
  if (!SHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID is not set in .env.local.");
  }

  await ensureHeaderRow();
  const serial = await getNextSerialNumber();
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:F`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          serial,
          record.name,
          record.fatherName,
          record.mobile,
          record.branch,
          new Date().toLocaleString("en-IN"),
        ],
      ],
    },
  });
}

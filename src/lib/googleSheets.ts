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
const HEADER = ["S.No", "Name", "Father's Name", "Mobile Number", "Branch", "Timestamp"];

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

/**
 * Serializes all Sheets API writes through this Node process so we never
 * have more than one append in flight at a time — keeps us under Google's
 * rate limits and avoids interleaved/garbled writes under concurrent load.
 * The serial number itself is no longer computed here (see route.ts) —
 * it's generated atomically in MongoDB before this is ever called, so
 * duplicate S.No values are no longer possible even under heavy load.
 */
let sheetQueue: Promise<unknown> = Promise.resolve();

function enqueueSheetWrite(task: () => Promise<void>) {
  sheetQueue = sheetQueue.then(task).catch((err) => {
    console.error("[google-sheets] queued write failed:", err);
  });
  return sheetQueue;
}

export async function appendAttendanceToSheet(record: IAttendance, serial: number) {
  if (!SHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID is not set in .env.local.");
  }

  enqueueSheetWrite(async () => {
    await ensureHeaderRow();
    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A:F`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            serial, // real integer from MongoDB's atomic counter — no formula
            record.name,
            record.fatherName,
            record.mobile,
            record.branch,
            new Date().toLocaleString("en-IN"),
          ],
        ],
      },
    });
  });
}
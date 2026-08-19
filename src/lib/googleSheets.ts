import { google } from "googleapis";
import { IAttendance } from "@/models/Attendance";

// Uses a Google service account to append rows to a Sheet only you own.
// Two tabs are used: "Registered" and "Unregistered" — appendAttendanceToSheet
// picks the tab based on the `tab` argument passed in from the API route.

const SHEET_ID = process.env.GOOGLE_SHEET_ID as string;
const HEADER = [
  "S.No",
  "Name",
  "Father's Name",
  "Mobile Number",
  "Branch",
  "Coming Alone / With Someone",
  "Members (Name - Relation)",
  "Total People",
  "Transport",
  "Timestamp",
];

export type SheetTab = "Registered" | "Unregistered";

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

const headerEnsuredForTab = new Set<string>();

async function ensureHeaderRow(tab: SheetTab) {
  if (headerEnsuredForTab.has(tab)) return;
  const sheets = await getSheetsClient();

  // Make sure the tab itself exists; create it if not.
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTabs = (meta.data.sheets || []).map(
    (s) => s.properties?.title
  );

  if (!existingTabs.includes(tab)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    });
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1:J1`,
  });

  const hasHeader = res.data.values && res.data.values.length > 0;

  if (!hasHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1:J1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER] },
    });
  }

  headerEnsuredForTab.add(tab);
}

/**
 * Serializes all Sheets API writes through this Node process so we never
 * have more than one append in flight at a time.
 */
let sheetQueue: Promise<unknown> = Promise.resolve();

function enqueueSheetWrite(task: () => Promise<void>) {
  sheetQueue = sheetQueue.then(task).catch((err) => {
    console.error("[google-sheets] queued write failed:", err);
  });
  return sheetQueue;
}

export async function appendAttendanceToSheet(
  record: IAttendance,
  serial: number,
  tab: SheetTab
) {
  if (!SHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID is not set in .env.local.");
  }

  const membersText = record.members?.length
    ? record.members.map((m) => `${m.name} (${m.relation})`).join(", ")
    : "0";
  const totalPeople = record.isComing
    ? 1 + (record.members?.length || 0)
    : 0;

  enqueueSheetWrite(async () => {
    await ensureHeaderRow(tab);
    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A:J`,
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
            !record.isComing
              ? "Not Coming"
              : record.comingAlone
                ? "Alone"
                : "With Someone",
            membersText,
            totalPeople,
            record.wantsTransport ? `Yes - ${record.transportStation}` : "No",
            new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          ],
        ],
      },
    });
  });
}
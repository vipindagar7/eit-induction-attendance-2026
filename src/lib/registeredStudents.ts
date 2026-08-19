import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

// Reads data/registered-students.xlsx (Name in column A, Father's Name in
// column B, header row required) and matches submissions against it.
//
// To update the list: just replace the .xlsx file at the path below and
// restart the app (pm2 restart) — no code changes needed.

const FILE_PATH = path.join(process.cwd(), "data", "registered-students.xlsx");

interface RegisteredStudent {
  name: string;
  fatherName: string;
}

let cache: RegisteredStudent[] | null = null;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function loadRegisteredStudents(): Promise<RegisteredStudent[]> {
  if (cache) return cache;

  if (!fs.existsSync(FILE_PATH)) {
    console.warn(
      `[registeredStudents] No file found at ${FILE_PATH} — every submission will be treated as Unregistered until you add one.`
    );
    cache = [];
    return cache;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE_PATH);
  const sheet = workbook.worksheets[0];

  const students: RegisteredStudent[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header row

    const name = row.getCell(1).text?.trim();
    const fatherName = row.getCell(2).text?.trim();

    if (name && fatherName) {
      students.push({ name, fatherName });
    }
  });

  console.log(`[registeredStudents] Loaded ${students.length} registered students.`);
  cache = students;
  return cache;
}

export async function isRegisteredStudent(
  name: string,
  fatherName: string
): Promise<boolean> {
  const students = await loadRegisteredStudents();
  const n = normalize(name);
  const f = normalize(fatherName);
  return students.some(
    (s) => normalize(s.name) === n && normalize(s.fatherName) === f
  );
}

// Call this if you ever want to force a re-read without restarting the
// server (e.g. from an admin route after uploading a new file).
export function clearRegisteredStudentsCache() {
  cache = null;
}
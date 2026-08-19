import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { clearRegisteredStudentsCache } from "@/lib/registeredStudents";

// Simple password-protected upload endpoint. Not fancy, but keeps random
// people from overwriting your student list if this URL leaks.
const ADMIN_SECRET = process.env.ADMIN_UPLOAD_SECRET;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const secret = formData.get("secret");
    const file = formData.get("file") as File | null;

    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, message: "ADMIN_UPLOAD_SECRET is not set on the server." },
        { status: 500 }
      );
    }

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, message: "Incorrect password." },
        { status: 401 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded." },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { success: false, message: "File must be a .xlsx file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const destPath = path.join(process.cwd(), "data", "registered-students.xlsx");
    await writeFile(destPath, buffer);

    // Force the app to re-read the file on the next lookup, no restart needed.
    clearRegisteredStudentsCache();

    return NextResponse.json(
      { success: true, message: "Registered student list updated successfully." },
      { status: 200 }
    );
  } catch (err) {
    console.error("[admin upload] failed:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong uploading the file." },
      { status: 500 }
    );
  }
}
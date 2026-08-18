import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { appendAttendanceToSheet } from "@/lib/googleSheets";

export async function POST(req: NextRequest) {
  try {
    const { name, fatherName, mobile, branch, otpVerified } = await req.json();

    if (!name || !fatherName || !mobile || !branch) {
      return NextResponse.json(
        { success: false, message: "All fields are required." },
        { status: 400 }
      );
    }

    if (!otpVerified) {
      return NextResponse.json(
        { success: false, message: "Mobile number is not verified." },
        { status: 400 }
      );
    }

    await connectDB();

    // Block a second attendance mark from the same mobile number.
    const existing = await Attendance.findOne({ mobile });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "This mobile number has already marked attendance." },
        { status: 409 }
      );
    }

    const record = await Attendance.create({ name, fatherName, mobile, branch });

    try {
      await appendAttendanceToSheet(record);
    } catch (sheetErr) {
      console.error("[google-sheets] failed to append row:", sheetErr);
    }

    return NextResponse.json(
      { success: true, message: "Attendance recorded successfully.", data: record },
      { status: 201 }
    );
  } catch (err: unknown) {
    // Mongo duplicate-key error as a fallback safety net (race condition
    // between the findOne check above and the create call).
    if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "This mobile number has already marked attendance." },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Something went wrong saving attendance." },
      { status: 500 }
    );
  }

}

export async function GET() {
  try {
    await connectDB();
    const records = await Attendance.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: records }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Something went wrong fetching attendance." },
      { status: 500 }
    );
  }
}
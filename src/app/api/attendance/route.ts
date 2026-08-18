import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { getNextSerial } from "@/models/Counter";
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

    const existing = await Attendance.findOne({ mobile });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "This mobile number has already marked attendance." },
        { status: 409 }
      );
    }

    const record = await Attendance.create({ name, fatherName, mobile, branch });
    const serial = await getNextSerial("attendance");

    try {
      await appendAttendanceToSheet(record, serial);
    } catch (sheetErr) {
      console.error("[google-sheets] failed to append row:", sheetErr);
    }

    return NextResponse.json(
      { success: true, message: "Attendance recorded successfully.", data: record },
      { status: 201 }
    );
  } catch (err: unknown) {
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
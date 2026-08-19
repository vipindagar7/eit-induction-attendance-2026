import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { getNextSerial } from "@/models/Counter";
import { appendAttendanceToSheet } from "@/lib/googleSheets";
import { isRegisteredStudent } from "@/lib/registeredStudents";
import { getISTDayRange } from "@/lib/dateRange";

interface MemberInput {
  name: string;
  relation: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      name,
      fatherName,
      mobile,
      branch,
      otpVerified,
      isComing,
      comingAlone,
      members,
      wantsTransport,
      transportStation,
    } = await req.json();

    if (!name || !fatherName || !mobile || !branch) {
      return NextResponse.json(
        { success: false, message: "All fields are required." },
        { status: 400 }
      );
    }

    if (typeof isComing !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Please answer whether you're coming." },
        { status: 400 }
      );
    }

    if (isComing) {
      if (typeof comingAlone !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Please answer whether you're coming alone." },
          { status: 400 }
        );
      }
      if (!comingAlone) {
        if (!Array.isArray(members) || members.length === 0) {
          return NextResponse.json(
            { success: false, message: "Please add at least one person with you." },
            { status: 400 }
          );
        }
        const invalidMember = (members as MemberInput[]).some(
          (m) => !m.name?.trim() || !m.relation?.trim()
        );
        if (invalidMember) {
          return NextResponse.json(
            { success: false, message: "Every person needs a name and relation." },
            { status: 400 }
          );
        }
      }
    }
    if (typeof wantsTransport !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Please answer whether you need transport." },
        { status: 400 }
      );
    }

    if (wantsTransport && !transportStation) {
      return NextResponse.json(
        { success: false, message: "Please select a transport station." },
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

    const { start, end } = getISTDayRange();
    const existing = await Attendance.findOne({
      mobile,
      createdAt: { $gte: start, $lt: end },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "This mobile number has already marked attendance today." },
        { status: 409 }
      );
    }

    const record = await Attendance.create({
      name,
      fatherName,
      mobile,
      branch,
      isComing,
      comingAlone: isComing ? comingAlone : null,
      members: isComing && !comingAlone ? members : [],
      wantsTransport,
      transportStation: wantsTransport ? transportStation : null,
    });
    const tab = (await isRegisteredStudent(name, fatherName)) ? "Registered" : "Unregistered";
    const serial = await getNextSerial(`attendance-${tab.toLowerCase()}`);

    try {
      await appendAttendanceToSheet(record, serial, tab);
    } catch (sheetErr) {
      console.error("[google-sheets] failed to append row:", sheetErr);
    }

    return NextResponse.json(
      { success: true, message: "Attendance recorded successfully.", data: record },
      { status: 201 }
    );
  } catch (err: unknown) {
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
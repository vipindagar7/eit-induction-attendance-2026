import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/otp";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { getISTDayRange } from "@/lib/dateRange";

export async function POST(req: NextRequest) {
  try {
    const { mobile } = await req.json();

    if (!mobile) {
      return NextResponse.json(
        { success: false, message: "Mobile number is required." },
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
        {
          success: false,
          message: "This mobile number has already marked attendance today.",
          alreadyMarked: true,
        },
        { status: 409 }
      );
    }

    const result = await sendOtp(mobile);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Something went wrong sending the OTP." },
      { status: 500 }
    );
  }
}
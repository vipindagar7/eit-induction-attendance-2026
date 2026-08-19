import mongoose, { Schema, models, model } from "mongoose";

export interface IMember {
  name: string;
  relation: string;
}

export interface IAttendance {
  name: string;
  fatherName: string;
  mobile: string;
  branch: string;
  isComing: boolean;
  comingAlone: boolean | null;
  members: IMember[];
  wantsTransport: boolean;
  transportStation: string | null;
  createdAt?: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const AttendanceSchema = new Schema<IAttendance>(
  {
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, index: true },
    branch: { type: String, required: true, trim: true },
    isComing: { type: Boolean, required: true },
    comingAlone: { type: Boolean, default: null },
    members: { type: [MemberSchema], default: [] },
    wantsTransport: { type: Boolean, required: true, default: false },
    transportStation: { type: String, default: null },
  },
  { timestamps: true }
);

export default models.Attendance ||
  model<IAttendance>("Attendance", AttendanceSchema);
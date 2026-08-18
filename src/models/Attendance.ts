import mongoose, { Schema, models, model } from "mongoose";

export interface IAttendance {
  name: string;
  fatherName: string;
  mobile: string;
  branch: string;
  createdAt?: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, unique: true, index: true },
    branch: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Prevent model overwrite errors during Next.js hot reload.
export default models.Attendance ||
  model<IAttendance>("Attendance", AttendanceSchema);

import mongoose, { Schema, models, model } from "mongoose";

// Single-document collection used purely to hand out atomically
// incrementing serial numbers, independent of MongoDB _id or timing.
interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = models.Counter || model<ICounter>("Counter", CounterSchema);

export async function getNextSerial(counterName: string): Promise<number> {
  const result = await Counter.findByIdAndUpdate(
    counterName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

export default Counter;
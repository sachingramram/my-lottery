// models/Daily.ts
import { Schema, model, models, type Model, type Document } from "mongoose";

export interface DailyDoc extends Document {
  date: string;           // YYYY-MM-DD (IST display date key)
  day: [string, string];  // two numbers (strings) for day slots
  night: [string, string];// two numbers (strings) for night slots
  createdAt: Date;
  updatedAt: Date;
}

const DailySchema = new Schema<DailyDoc>(
  {
    date: { type: String, required: true, unique: true, index: true },
    day:  { type: [String], default: ["", ""], required: true },
    night:{ type: [String], default: ["", ""], required: true },
  },
  { timestamps: true }
);

export default (models.Daily as Model<DailyDoc>) || model<DailyDoc>("Daily", DailySchema);
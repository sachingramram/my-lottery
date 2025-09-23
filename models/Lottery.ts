import { Schema, model, models } from "mongoose";

const WeekSchema = new Schema(
  {
    range: { type: String, required: true },               // "2025-01-01 to 2025-01-05"
    days:  { type: [String], default: ["","","","","","",""] }, // Mon..Sun
  },
  { _id: false }
);

const LotterySchema = new Schema(
  {
    year: { type: Number, required: true, index: true },
    type: { type: String, enum: ["day","night"], required: true, index: true },
    weeks:{ type: [WeekSchema], default: [] },
  },
  { timestamps: true }
);

LotterySchema.index({ year:1, type:1 }, { unique:true });
export default models.Lottery || model("Lottery", LotterySchema);

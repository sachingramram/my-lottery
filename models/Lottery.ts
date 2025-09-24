import { Schema, model, models, type Model, type HydratedDocument, type Document } from "mongoose";

export type ChartType = "day" | "night";

export interface WeekNode {
  range: string;
  days: string[]; // length 7 expected
}

export interface LotteryAttrs {
  year: number;
  type: ChartType;
  weeks: WeekNode[];
}

export interface LotteryDoc extends Document, LotteryAttrs {}

type LotteryModel = Model<LotteryDoc>;

const WeekSchema = new Schema<WeekNode>(
  {
    range: { type: String, required: true },
    days: { type: [String], required: true, default: [] },
  },
  { _id: false }
);

const LotterySchema = new Schema<LotteryDoc>(
  {
    year: { type: Number, required: true },
    type: { type: String, enum: ["day", "night"], required: true },
    weeks: { type: [WeekSchema], required: true, default: [] },
  },
  { timestamps: true }
);

LotterySchema.index({ year: 1, type: 1 }, { unique: true });

export type { HydratedDocument as LotteryHydratedDoc };
export default (models.Lottery as LotteryModel) || model<LotteryDoc, LotteryModel>("Lottery", LotterySchema);
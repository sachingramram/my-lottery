import mongoose, { Schema, Document } from "mongoose";

export interface IResult extends Document {
  type: "day" | "night";
  value: string;
}

const ResultSchema = new Schema<IResult>(
  {
    type: { type: String, enum: ["day", "night"], required: true, unique: true },
    value: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Result ||
  mongoose.model<IResult>("Result", ResultSchema);

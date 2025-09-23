import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Lottery from "@/models/Lottery";
import { buildYearRows } from "@/lib/weeks";

export const runtime = "nodejs";

type ChartType = "day" | "night";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const typeParam = (searchParams.get("type") ?? "").toLowerCase();
    const type: ChartType | "" =
      typeParam === "day" || typeParam === "night" ? typeParam : "";

    if (!Number.isFinite(year) || year < 1 || type === "") {
      return NextResponse.json(
        { ok: false as const, error: "Invalid year/type" },
        { status: 400 }
      );
    }

    await dbConnect();

    // ✅ use upsert: if not exists, insert; else return existing
    const doc = await Lottery.findOneAndUpdate(
      { year, type },
      { $setOnInsert: { weeks: buildYearRows(year) } },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({ ok: true as const, data: doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 500 }
    );
  }
}

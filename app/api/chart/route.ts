// app/api/chart/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Lottery, { type LotteryDoc, type WeekNode, type ChartType } from "@/models/Lottery";
import type { HydratedDocument } from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isType(v: string): v is ChartType {
  return v === "day" || v === "night";
}

/* ---------- UTC-safe helpers ---------- */
function dUTC(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}
function addDaysUTC(dt: Date, days: number): Date {
  return new Date(dt.getTime() + days * 86_400_000);
}
function fmtUTC(dt: Date): string {
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
}

/* ---------- Build correct week rows (Jan 1 -> first Sun, then Mon->Sun, cap Dec 31) ---------- */
function buildYearRows(year: number): WeekNode[] {
  const rows: WeekNode[] = [];
  let start = dUTC(year, 0, 1);
  const yearEnd = dUTC(year, 11, 31);

  while (start <= yearEnd) {
    const dow = start.getUTCDay(); // 0=Sun
    const daysToSunday = dow === 0 ? 0 : 7 - dow;
    let end = addDaysUTC(start, daysToSunday);
    if (end > yearEnd) end = yearEnd;

    rows.push({
      range: `${fmtUTC(start)} to ${fmtUTC(end)}`,
      days: ["", "", "", "", "", "", ""],
    });

    start = addDaysUTC(end, 1);
  }
  return rows;
}

export async function GET(req: Request) {
  // Always produce a valid JSON response, even if DB fails
  const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

  try {
    const { searchParams } = new URL(req.url);
    const yearRaw = searchParams.get("year");
    const typeRaw = (searchParams.get("type") ?? "").toLowerCase();

    const year = Number(yearRaw);
    const type = isType(typeRaw) ? typeRaw : null;

    if (!Number.isFinite(year) || year < 1 || !type) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid year/type" },
        { status: 400, headers: noStore }
      );
    }

    // Build authoritative ranges for this year
    const correct: WeekNode[] = buildYearRows(year);

    // Try DB; if anything fails, return ephemeral data (still ok:true)
    try {
      await dbConnect();

      let doc: HydratedDocument<LotteryDoc> | null = await Lottery.findOne({ year, type }).exec();
      if (!doc) {
        doc = await Lottery.create({ year, type, weeks: correct });
      } else {
        // Normalize existing doc to match "correct" ranges & shape (7 days)
        const nextWeeks: WeekNode[] = [];
        const max = correct.length;

        for (let i = 0; i < max; i++) {
          const src = doc.weeks[i];
          const safeDays: string[] = Array.from({ length: 7 }, (_, j) => {
            const v = src?.days?.[j];
            return typeof v === "string" ? v : "";
          });
          nextWeeks.push({ range: correct[i].range, days: safeDays });
        }

        const lengthChanged = doc.weeks.length !== nextWeeks.length;
        let changed = lengthChanged;

        if (!changed) {
          for (let i = 0; i < nextWeeks.length; i++) {
            if (doc.weeks[i]?.range !== nextWeeks[i].range) {
              changed = true; break;
            }
            if (!Array.isArray(doc.weeks[i]?.days) || doc.weeks[i].days.length !== 7) {
              changed = true; break;
            }
          }
        }

        if (changed) {
          doc.weeks = nextWeeks;
          await doc.save();
        }
      }

      const res = NextResponse.json({ ok: true as const, data: doc.toObject() }, { headers: noStore });
      return res;
    } catch {
      // DB unavailable or save failed → still return correct weeks (ephemeral)
      return NextResponse.json(
        { ok: true as const, data: { year, type, weeks: correct }, ephemeral: true as const },
        { headers: noStore }
      );
    }
  } catch (err) {
    // Last-resort: parse errors etc — still return a sane payload to avoid client "offline" mode
    const now = new Date();
    const fallbackYear = now.getUTCFullYear();
    const fallbackWeeks = buildYearRows(fallbackYear);
    return NextResponse.json(
      {
        ok: true as const,
        data: { year: fallbackYear, type: "day" as ChartType, weeks: fallbackWeeks },
        ephemeral: true as const,
      },
      { headers: noStore }
    );
  }
}
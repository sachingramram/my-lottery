// app/api/chart/cell/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/mongodb";
import Lottery from "@/models/Lottery";

export const runtime = "nodejs";

const cookieName = "admintoken";

/* ---------- types & guards ---------- */
type ChartType = "day" | "night";

type PatchBody = {
  year: number;
  type: ChartType;
  weekIndex: number;
  dayIndex: number;
  value: string;
};

function isChartType(v: string): v is ChartType {
  return v === "day" || v === "night";
}

function isPatchBody(v: unknown): v is PatchBody {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.year === "number" &&
    Number.isFinite(r.year) &&
    typeof r.type === "string" &&
    isChartType(r.type) &&
    typeof r.weekIndex === "number" &&
    Number.isInteger(r.weekIndex) &&
    r.weekIndex >= 0 &&
    typeof r.dayIndex === "number" &&
    Number.isInteger(r.dayIndex) &&
    r.dayIndex >= 0 &&
    r.dayIndex <= 6 &&
    typeof r.value === "string"
  );
}

/* ---------- auth ---------- */
async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies();      // await lagao
const token = cookieStore.get(cookieName)?.value;

  // lightweight “exists” check; if you use JWT verify, import and verify here.
  return typeof token === "string" && token.length > 0;
}

/* ---------- sanitize ---------- */
function sanitizeDigitsSpacesNewlines(input: string): string {
  return input
    .replace(/[^\d\s\n]/g, "")
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .join("\n");
}

/* ---------- PATCH: save a single cell ---------- */
export async function PATCH(req: Request) {
  try {
    if (!(await isAuthed())) {
      return NextResponse.json(
        { ok: false as const, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const bodyUnknown = await req.json().catch(() => null);
    if (!isPatchBody(bodyUnknown)) {
      return NextResponse.json(
        { ok: false as const, error: "Bad payload" },
        { status: 400 }
      );
    }

    const { year, type, weekIndex, dayIndex } = bodyUnknown;
    const value = sanitizeDigitsSpacesNewlines(bodyUnknown.value);

    await dbConnect();

    const doc = await Lottery.findOne({ year, type });
    if (!doc) {
      return NextResponse.json(
        { ok: false as const, error: "Chart not found" },
        { status: 404 }
      );
    }

    if (!doc.weeks[weekIndex] || dayIndex < 0 || dayIndex > 6) {
      return NextResponse.json(
        { ok: false as const, error: "Bad indexes" },
        { status: 400 }
      );
    }

    doc.weeks[weekIndex].days[dayIndex] = value;
    await doc.save();

    return NextResponse.json({ ok: true as const, value });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 500 }
    );
  }
}

/* ---------- DELETE: clear a single cell ---------- */
export async function DELETE(req: Request) {
  try {
    if (!(await isAuthed())) {
      return NextResponse.json(
        { ok: false as const, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const yearRaw = searchParams.get("year");
    const typeRaw = searchParams.get("type") ?? "";
    const weekIndexRaw = searchParams.get("weekIndex");
    const dayIndexRaw = searchParams.get("dayIndex");

    const year = Number(yearRaw);
    const weekIndex = Number(weekIndexRaw);
    const dayIndex = Number(dayIndexRaw);
    const typeValid = isChartType(typeRaw);

    const valid =
      Number.isFinite(year) &&
      Number.isInteger(weekIndex) &&
      weekIndex >= 0 &&
      Number.isInteger(dayIndex) &&
      dayIndex >= 0 &&
      dayIndex <= 6 &&
      typeValid;

    if (!valid) {
      return NextResponse.json(
        { ok: false as const, error: "Bad query params" },
        { status: 400 }
      );
    }

    await dbConnect();

    const doc = await Lottery.findOne({ year, type: typeRaw as ChartType });
    if (!doc) {
      return NextResponse.json(
        { ok: false as const, error: "Chart not found" },
        { status: 404 }
      );
    }

    if (!doc.weeks[weekIndex]) {
      return NextResponse.json(
        { ok: false as const, error: "Bad indexes" },
        { status: 400 }
      );
    }

    doc.weeks[weekIndex].days[dayIndex] = "";
    await doc.save();

    return NextResponse.json({ ok: true as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 500 }
    );
  }
}

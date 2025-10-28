// app/api/daily/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/mongodb";
import Daily from "@/models/Daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const cookieName = "admintoken";

/* ---------- IST helpers ---------- */
const MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function nowIST(): Date {
  const now = Date.now();
  // Convert “this moment” to IST by shifting epoch to IST and reading UTC parts
  const istEpoch = now + IST_OFFSET_MS;
  return new Date(istEpoch);
}

function istDisplayDateYYYYMMDD(): string {
  // Business rule: date rolls at 12:00 PM IST
  const ist = nowIST();
  const hours = ist.getUTCHours(); // we've shifted the epoch, so UTC-hours == IST-hours
  const base = new Date(ist);
  if (hours < 1) base.setUTCDate(base.getUTCDate() - 1); // before noon → show yesterday
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ---------- sanitize ---------- */
function sanitizeNumber(input: string): string {
  // allow digits, spaces, slash, dash, and * # @
  return input.replace(/[^0-9*#@/\-\s]/g, "").trim().slice(0, 40);
}

/* ---------- GET ---------- */
export async function GET(req: Request) {
  try {
    const store = await cookies();
    const isAdmin = Boolean(store.get(cookieName)?.value);

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // optional YYYY-MM-DD
    const date = dateParam || istDisplayDateYYYYMMDD();

    await dbConnect();

    let doc = await Daily.findOne({ date });
    if (!doc) {
      doc = await Daily.create({ date, day: ["", ""], night: ["", ""] });
    }

    return NextResponse.json(
      {
        ok: true as const,
        data: {
          date: doc.date,
          day: doc.day,
          night: doc.night,
          isAdmin,
          // static slots to render labels
          slots: {
            day: ["11:00:00 AM", "12:00:00 PM"],
            night: ["06:30:00 PM", "07:30:00 PM"],
          },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false as const, error: message }, { status: 500 });
  }
}

/* ---------- PATCH (admin only) ---------- */
export async function PATCH(req: Request) {
  try {
    const store = await cookies();
    const isAdmin = Boolean(store.get(cookieName)?.value);
    if (!isAdmin) {
      return NextResponse.json({ ok: false as const, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
      | { date?: string; slot: "day1" | "day2" | "night1" | "night2"; value: string }
      | null;

    if (!body || !body.slot || typeof body.value !== "string") {
      return NextResponse.json({ ok: false as const, error: "Bad payload" }, { status: 400 });
    }

    const date = body.date || istDisplayDateYYYYMMDD();
    const clean = sanitizeNumber(body.value);

    await dbConnect();

    const doc =
      (await Daily.findOne({ date })) ||
      (await Daily.create({ date, day: ["", ""], night: ["", ""] }));

    if (body.slot === "day1") doc.day[0] = clean;
    if (body.slot === "day2") doc.day[1] = clean;
    if (body.slot === "night1") doc.night[0] = clean;
    if (body.slot === "night2") doc.night[1] = clean;

    await doc.save();

    return NextResponse.json({
      ok: true as const,
      data: { date: doc.date, day: doc.day, night: doc.night },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false as const, error: message }, { status: 500 });
  }
}
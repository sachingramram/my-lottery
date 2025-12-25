import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/mongodb";
import Result from "@/models/Result";

const ADMIN_COOKIE = "admintoken";

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return typeof token === "string" && token.length > 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type !== "day" && type !== "night") {
    return NextResponse.json({ ok: false });
  }

  await dbConnect();
  const doc = await Result.findOne({ type });

  return NextResponse.json({
    ok: true,
    value: doc?.value ?? "",
  });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { type, value } = body as { type?: string; value?: string };

  if ((type !== "day" && type !== "night") || typeof value !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await dbConnect();

  const clean = value.replace(/[^0-9\- ]/g, "").trim();

  const doc = await Result.findOneAndUpdate(
    { type },
    { value: clean },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, value: doc.value });
}

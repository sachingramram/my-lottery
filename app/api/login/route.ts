// app/api/login/route.ts
import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export const runtime = "nodejs";

const cookieName = "admintoken";
const secretBytes = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev_secret_change_me"
);

type LoginBody = {
  username: string;
  password: string;
};

function isLoginBody(v: unknown): v is LoginBody {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).username === "string" &&
    typeof (v as Record<string, unknown>).password === "string"
  );
}

export async function POST(req: Request) {
  try {
    const bodyUnknown = await req.json().catch(() => null);
    if (!isLoginBody(bodyUnknown)) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid payload" },
        { status: 400 }
      );
    }

    const { username, password } = bodyUnknown;
    const expectedUser = process.env.ADMIN_USER ?? "admin";
    const expectedPass = process.env.ADMIN_PASS ?? "supersecret";

    const okCreds = username === expectedUser && password === expectedPass;
    if (!okCreds) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(secretBytes);

    const res = NextResponse.json({ ok: true as const });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 500 }
    );
  }
}

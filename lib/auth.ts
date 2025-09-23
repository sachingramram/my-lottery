import { SignJWT, jwtVerify } from "jose";
export const cookieName = "admintoken";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function signAdmin() {
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function isAuthed(token?: string | null) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload?.role === "admin";
  } catch { return false; }
}

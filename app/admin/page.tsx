// app/admin/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginOk = { ok: true };
type LoginErr = { ok: false; error?: string };
type LoginResp = LoginOk | LoginErr;

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include", // ensure Set-Cookie from API is stored
        body: JSON.stringify({ username, password }),
      });

      // Read as text first to handle any HTML error pages
      const raw = await res.text();
      let json: LoginResp;
      try {
        json = JSON.parse(raw) as LoginResp;
      } catch {
        throw new Error("Server returned non-JSON. Is /api/login set up?");
      }

      if (!json.ok) {
        setErr(json.error || "Invalid credentials");
        return;
      }

      // ✅ Successful login: redirect to landing page
      router.replace("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-md mx-auto mt-10 p-4 sm:p-6 bg-[var(--yellow)] border-strong border-[var(--red)]">
      <h1 className="text-center text-[var(--red)] text-2xl sm:text-3xl font-bold mb-4">
        Admin Login
      </h1>

      {err && (
        <div className="mb-3 text-sm text-[var(--red)] bg-white/70 border border-[var(--red)] px-3 py-2">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="block text-[var(--red)] mb-1">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full border border-[var(--red)] bg-yellow-300/30 text-[var(--red)] px-3 py-2"
            required
          />
        </label>

        <label className="block">
          <span className="block text-[var(--red)] mb-1">Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[var(--red)] bg-yellow-300/30 text-[var(--red)] px-3 py-2"
            required
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[var(--yellow)] text-[var(--red)] border-strong border-[var(--red)] py-2 mt-2"
        >
          {busy ? "Logging in…" : "Login"}
        </button>
      </form>
    </main>
  );
}

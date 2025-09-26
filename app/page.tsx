// app/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ---------------- constants you already had ---------------- */
const START_YEAR = 2023;
const END_YEAR = 2025;
const TYPES = ["night", "day"] as const;
const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => END_YEAR - i);

/* ---------------- types to match /api/daily ---------------- */
type Slots = { day: [string, string]; night: [string, string] };

type DailyData = {
  date: string;             // YYYY-MM-DD (IST display date from API)
  day: [string, string];    // two values for day slots
  night: [string, string];  // two values for night slots
  isAdmin: boolean;         // server decided via cookie
  slots: Slots;             // labels; we still print static times below
};

type GetDailyOk = { ok: true; data: DailyData };
type GetDailyErr = { ok: false; error: string };
type GetDailyResp = GetDailyOk | GetDailyErr;

type PatchDailyOk = { ok: true; data: { date: string; day: [string, string]; night: [string, string] } };
type PatchDailyErr = { ok: false; error: string };
type PatchDailyResp = PatchDailyOk | PatchDailyErr;

/* ---------------- page ---------------- */
export default function Home() {
  const [daily, setDaily] = useState<DailyData | null>(null);
  const [busy, setBusy] = useState<null | "day1" | "day2" | "night1" | "night2">(null);
  const [draft, setDraft] = useState<{ day: [string, string]; night: [string, string] } | null>(null);

  // initial fetch
  useEffect(() => {
    void refetchDaily(setDaily, setDraft);
  }, []);

  // auto-refetch exactly at 12:00 PM IST every day
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = msUntilNextISTNoon();
      timer = setTimeout(async () => {
        await refetchDaily(setDaily, setDraft);
        schedule(); // schedule the next noon
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // loading
  if (!daily || !draft) {
    return (
      <>
        <header className="mx-auto bg-[var(--yellow)] text-[var(--red)] text-center border-strong border-[var(--red)] py-3 sm:py-4 md:py-8">
          <h1 className="text-2xl sm:text-3xl md:text-6xl font-extrabold">JAI METRO</h1>
          <p className="text-xs sm:text-lg md:text-3xl mt-0.5 sm:mt-1">YOUR LUCK LOTTERY NUMBER</p>
        </header>
        <div className="p-3 sm:p-4 text-[var(--red)] text-xs sm:text-sm">Loading…</div>
      </>
    );
  }

  const dateLabel = toDDMMYYYY(daily.date);

  // static times (kept exactly as requested)
  const DAY_TIMES: [string, string] = ["12:30:00 PM", "01:30:00 PM"];
  const NIGHT_TIMES: [string, string] = ["08:01:00 PM", "10:30:00 PM"];

  // helpers for save/delete
  async function saveSlot(slot: "day1" | "day2" | "night1" | "night2", value: string) {
    setBusy(slot);
    try {
      const res = await fetch("/api/daily", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, value }),
      });
      const json: PatchDailyResp = await res.json();
      if (!json.ok) throw new Error(json.error || "Save failed");
      setDaily((prev) =>
        prev ? { ...prev, day: json.data.day as [string, string], night: json.data.night as [string, string] } : prev
      );
      setDraft({ day: [...json.data.day] as [string, string], night: [...json.data.night] as [string, string] });
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  async function deleteSlot(slot: "day1" | "day2" | "night1" | "night2") {
    await saveSlot(slot, ""); // server treats empty as cleared
  }

  // rows composed from API (preserving your structure)
  const dayRows = [
    { saved: daily.day[0], value: draft.day[0], date: dateLabel, time: DAY_TIMES[0], slot: "day1" as const, idx: 0 },
    { saved: daily.day[1], value: draft.day[1], date: dateLabel, time: DAY_TIMES[1], slot: "day2" as const, idx: 1 },
  ];
  const nightRows = [
    { saved: daily.night[0], value: draft.night[0], date: dateLabel, time: NIGHT_TIMES[0], slot: "night1" as const, idx: 0 },
    { saved: daily.night[1], value: draft.night[1], date: dateLabel, time: NIGHT_TIMES[1], slot: "night2" as const, idx: 1 },
  ];
  

  return (
    <>
    {/* Top autoplay video */}
{/* Top autoplay video */}
<section className="mt-2 md:mt-3">
  <div className="mx-auto border-strong border-[var(--red)] bg-[var(--yellow)] p-1 sm:p-1.5 md:p-2">
    <video
      src="/video3.mp4"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onEnded={(e) => {
        const v = e.currentTarget;
        v.currentTime = 0;           // jump back instantly
        void v.play();               // resume immediately
      }}
      onCanPlay={(e) => {
        const v = e.currentTarget;
        if (v.paused) void v.play(); // ensure autoplay if browser hesitates
      }}
      className="block w-full object-cover
                 max-h-[180px] sm:max-h-[220px] md:max-h-[260px]"
    />
  </div>
</section>


      <header className="mx-auto bg-[var(--yellow)] text-[var(--red)] text-center border-strong border-[var(--red)] py-3 sm:py-4 md:py-8">
        <h1 className="text-2xl sm:text-3xl md:text-6xl font-extrabold">JAI METRO</h1>
        <p className="text-xs sm:text-lg md:text-3xl mt-0.5 sm:mt-1">YOUR LUCK LOTTERY NUMBER</p>
      </header>

      {/* 3 columns on ALL screens; tighter gaps and tiny fonts on mobile */}
      <section className="mt-4 sm:mt-6 grid grid-cols-3 gap-1 sm:gap-2 md:gap-4">
        {/* Jai Metro Day */}
        <Mini
          title="Jai Metro Day"
          rows={dayRows.map((r) => ({
            number: (
              <NumberCell
                saved={r.saved}
                value={r.value}
                editable={daily.isAdmin}
                saving={busy === r.slot}
                onChange={(v) => {
                  setDraft((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, day: [...prev.day] as [string, string] };
                    next.day[r.idx] = v;
                    return next;
                  });
                }}
                onSave={() => saveSlot(r.slot, draft.day[r.idx])}
                onDelete={() => deleteSlot(r.slot)}
              />
            ),
            date: r.date,
            time: r.time,
          }))}
        />

        {/* Center image */}
        <div className="flex justify-center">
  <figure className="border-strong border-[var(--red)] bg-[var(--yellow)] p-0.5 sm:p-1 md:p-1.5">
    <img
      src="/kalash.jfif"
      alt="idol"
      className="w-full max-w-[64px] xs:max-w-[84px] sm:max-w-[130px] md:max-w-[200px] h-auto object-cover"
    />
  </figure>
</div>

        {/* Jai Metro Night (2 rows) */}
        <Mini
          title="Jai Metro Night"
          rows={nightRows.map((r) => ({
            number: (
              <NumberCell
                saved={r.saved}
                value={r.value}
                editable={daily.isAdmin}
                saving={busy === r.slot}
                onChange={(v) => {
                  setDraft((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, night: [...prev.night] as [string, string] };
                    next.night[r.idx] = v;
                    return next;
                  });
                }}
                onSave={() => saveSlot(r.slot, draft.night[r.idx])}
                onDelete={() => deleteSlot(r.slot)}
              />
            ),
            date: r.date,
            time: r.time,
          }))}
        />
      </section>

      <nav className="mt-6 sm:mt-8 space-y-2 sm:space-y-3 md:space-y-6">
        {years.map((y) =>
          TYPES.map((t) => (
            <Link
              key={`${y}-${t}`}
              href={`/chart/${y}/${t}`}
              className="block text-center bg-[var(--yellow)] text-[var(--red)] text-sm sm:text-xl md:text-3xl border-strong border-[var(--red)] py-2.5 sm:py-4 md:py-6 hover:opacity-90"
            >
              {`Jai Metro ${t[0].toUpperCase() + t.slice(1)} Panel Chart ${y}`}
            </Link>
          ))
        )}
        <Link href="/admin" className="block text-center underline text-[10px] sm:text-sm text-yellow-200">
          Admin Login
        </Link>
      </nav>
    </>
  );
}

/* ---------------- small building blocks (extra-compact + aligned grid) ---------------- */
function Mini({
  title,
  rows,
}: {
  title: string;
  rows: { number: React.ReactNode; date: string; time: string }[];
}) {
  return (
    <div className="bg-[var(--yellow)] border-strong border-[var(--red)] overflow-hidden">
      <div className="text-center py-1 sm:py-1.5 md:py-3 text-[9px] sm:text-sm md:text-2xl text-[var(--red)] border-b-strong border-[var(--red)]">
        {title}
      </div>

      {/* Perfect alignment: remove table outer border, use box-border + collapse, keep borders on cells */}
      <table className="w-full text-[var(--red)] text-[9px] sm:text-xs md:text-lg box-border border-collapse">
        <thead>
          <tr className="text-center">
            {["Number", "Date", "Time"].map((h, i) => (
              <th
                key={i}
                className="py-1 sm:py-1.5 md:py-3 px-1 sm:px-2 border border-[var(--red)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="text-center">
              <Td>{r.number}</Td>
              <Td>{r.date}</Td>
              <Td>
                <div className="leading-tight">
                  <div>{r.time.split(" ")[0]}</div>
                  <div className="uppercase">{r.time.split(" ")[1]}</div>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-1 sm:py-2 md:py-5 px-1 sm:px-2 border border-[var(--red)]">
      {children}
    </td>
  );
}

/* --------- NumberCell: smallest square input; micro buttons below; save shown only when dirty --------- */
function NumberCell({
  saved,
  value,
  editable,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  saved: string;   // last saved value from server
  value: string;   // current draft value
  editable: boolean;
  saving: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  if (!editable) {
    return <span>{value || "-"}</span>;
  }

  const dirty = value !== saved;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-20 md:h-20
                   text-center text-[10px] xs:text-[11px] sm:text-sm md:text-xl
                   border border-[var(--red)] bg-yellow-300/30 text-[var(--red)]"
        placeholder=""
      />
      <div className="grid grid-cols-2 gap-1">
        {/* Show Save only when dirty */}
        {dirty ? (
          <button
            onClick={onSave}
            disabled={saving}
            className="px-1 py-[1px] text-[8px] sm:text-[10px] md:text-xs border border-[var(--red)]
                       bg-[var(--yellow)] text-[var(--red)] leading-none"
          >
            {saving ? "…" : "Save"}
          </button>
        ) : (
          <span className="px-1 py-[1px] text-[8px] sm:text-[10px] md:text-xs opacity-0 select-none leading-none">.</span>
        )}
        <button
          onClick={onDelete}
          disabled={saving}
          className="px-1 py-[1px] text-[8px] sm:text-[10px] md:text-xs border border-[var(--red)]
                     bg-white text-[var(--red)] leading-none"
          title="Clear"
        >
          Del
        </button>
      </div>
    </div>
  );
}

/* ---------------- utils ---------------- */
function toDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/* ---------------- IST noon scheduler helpers ---------------- */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function msUntilNextISTNoon(): number {
  const now = Date.now();
  const istNow = new Date(now + IST_OFFSET_MS); // shift epoch to IST
  const y = istNow.getUTCFullYear();
  const m = istNow.getUTCMonth();
  const d = istNow.getUTCDate();

  // today 12:00:00 IST → convert back to real epoch by subtracting offset
  const todayNoonIST_asUTC = Date.UTC(y, m, d, 12, 0, 0);
  let target = todayNoonIST_asUTC - IST_OFFSET_MS;

  if (now >= target) {
    // already past today's noon IST → schedule tomorrow noon
    const tomorrowIST = new Date(istNow);
    tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1);
    const y2 = tomorrowIST.getUTCFullYear();
    const m2 = tomorrowIST.getUTCMonth();
    const d2 = tomorrowIST.getUTCDate();
    target = Date.UTC(y2, m2, d2, 12, 0, 0) - IST_OFFSET_MS;
  }

  return Math.max(0, target - now);
}

async function refetchDaily(
  setDaily: React.Dispatch<React.SetStateAction<DailyData | null>>,
  setDraft: React.Dispatch<React.SetStateAction<{ day: [string, string]; night: [string, string] } | null>>
) {
  const res = await fetch("/api/daily", { cache: "no-store" });
  const json: GetDailyResp = await res.json();
  if (json.ok) {
    setDaily(json.data);
    setDraft({ day: [...json.data.day] as [string, string], night: [...json.data.night] as [string, string] });
  }
}

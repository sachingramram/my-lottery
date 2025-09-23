"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/* ---------------- types ---------------- */
type ChartType = "day" | "night";
type Week = { range: string; days: string[] };

type ApiChartOk = { ok: true; data: { weeks: Week[] } };
type ApiChartErr = { ok: false; error?: string };
type ApiChartResp = ApiChartOk | ApiChartErr;

/* ----------- runtime guards ----------- */
function isWeek(v: unknown): v is Week {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).range === "string" &&
    Array.isArray((v as Record<string, unknown>).days) &&
    (v as { days: unknown[] }).days.every((d) => typeof d === "string")
  );
}
function isApiChartResp(v: unknown): v is ApiChartResp {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (r.ok === true) {
    const data = r.data as unknown;
    return (
      typeof data === "object" &&
      data !== null &&
      Array.isArray((data as { weeks?: unknown[] }).weeks) &&
      (data as { weeks: unknown[] }).weeks.every(isWeek)
    );
  }
  if (r.ok === false) return true;
  return false;
}

/* --------------- page ----------------- */
export default function ChartPage() {
  // narrow params safely (avoid string | undefined)
  const params = useParams<{ year?: string; type?: ChartType }>();
  const yearStr = params.year ?? "0";
  const type = (params.type ?? "day") as ChartType;
  const y = Number(yearStr);

  const title = (type === "day" ? "Jai Metro Day Chart " : "Jai Metro Night Chart ") + y;

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [offline, setOffline] = useState(false); // DB/API unreachable -> fallback

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      setOffline(false);
      try {
        const res = await fetch(`/api/chart?year=${y}&type=${type}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const raw = await res.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new Error("Server returned non-JSON (likely HTML error).");
        }

        if (!isApiChartResp(parsed)) throw new Error("Unexpected API shape.");
        if (!parsed.ok) throw new Error(parsed.error ?? "API returned error.");

        if (!cancelled) setWeeks(parsed.data.weeks);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to load API, showing offline view";
        if (!cancelled) {
          setWeeks(buildYearRows(y)); // Fallback: local rows
          setOffline(true);
          setErr(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [y, type]);

  return (
    <>
      {/* Back + ribbon */}
      <div className="mb-3 md:mb-6 flex items-center gap-2 md:gap-3">
        <Link
          href="/"
          className="bg-[var(--yellow)] text-[var(--red)] border-strong border-[var(--red)] px-2 md:px-4 py-1.5 md:py-2 text-sm md:text-lg"
        >
          ⬅ BACK
        </Link>
        <div className="flex-1 text-center bg-[var(--yellow)] text-[var(--red)] text-lg md:text-3xl border-strong border-[var(--red)] py-1.5 md:py-2">
          Jai Metro Today Lottery Number
        </div>
      </div>

      <div className="border-strong border-[var(--red)] bg-[var(--yellow)]">
        <div className="flex items-center justify-center gap-2 text-[var(--red)] text-xl md:text-3xl py-1.5 md:py-3 border-b-strong border-[var(--red)]">
          <span>{title}</span>
          {offline && (
            <span className="text-xs md:text-sm bg-white/60 border border-[var(--red)] px-2 py-0.5 rounded">
              DB offline – read-only
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-4 text-center text-[var(--red)]">Loading…</div>
        ) : (
          <>
            {err && (
              <div className="px-3 py-2 text-center text-[var(--red)] text-xs md:text-sm">{err}</div>
            )}

            <table className="w-full text-[var(--red)] table-xs table-fixed">
              <thead>
                <tr className="text-center">
                  <Th className="w-[20%]">Week Range</Th>
                  <Th className="w-[11.5%]">Mon</Th>
                  <Th className="w-[11.5%]">Tue</Th>
                  <Th className="w-[11.5%]">Wed</Th>
                  <Th className="w-[11.5%]">Thu</Th>
                  <Th className="w-[11.5%]">Fri</Th>
                  <Th className="w-[11.5%]">Sat</Th>
                  <Th className="w-[11.5%]">Sun</Th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w, wi) => (
                  <tr key={wi}>
                    <Td className="text-center whitespace-pre-wrap">{w.range}</Td>
                    {w.days.map((val, di) =>
                      offline ? (
                        <Td key={di} className="text-center min-h-[56px] md:min-h-[72px]">
                          <PanelView value={val} />
                        </Td>
                      ) : (
                        <EditCell
                          key={di}
                          initial={val}
                          onSave={async (next) => {
                            type SaveResp = { ok: true; value: string } | { ok: false; error?: string };
                            const res = await fetch("/api/chart/cell", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                year: y,
                                type,
                                weekIndex: wi,
                                dayIndex: di,
                                value: next,
                              }),
                            });
                            const data: SaveResp = await res.json();

                            if (!data.ok) {
                              alert(data.error || "Save failed");
                              return false;
                            }

                            setWeeks((prev) => {
                              const copy = [...prev];
                              copy[wi] = { ...copy[wi], days: [...copy[wi].days] };
                              copy[wi].days[di] = data.value; // value is string here
                              return copy;
                            });
                            return true;
                          }}
                          onClear={async () => {
                            type DelResp = { ok: true } | { ok: false; error?: string };
                            const url = `/api/chart/cell?year=${y}&type=${type}&weekIndex=${wi}&dayIndex=${di}`;
                            const res = await fetch(url, { method: "DELETE" });
                            const data: DelResp = await res.json();
                            if (!data.ok) {
                              alert(data.error || "Delete failed");
                              return;
                            }
                            setWeeks((prev) => {
                              const copy = [...prev];
                              copy[wi] = { ...copy[wi], days: [...copy[wi].days] };
                              copy[wi].days[di] = "";
                              return copy;
                            });
                          }}
                        />
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}

/* -------------- small ui helpers -------------- */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border-strong border-[var(--red)] px-1 md:px-2 py-1.5 md:py-3 ${className}`}>{children}</th>
  );
}
function Td({ children = null, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`border-strong border-[var(--red)] px-1 md:px-2 py-2 md:py-3 align-top ${className}`}>
      {children}
    </td>
  );
}

/* ---------------- panel layout ---------------- */
type Panel = {
  tl: string; tr: string;
  ml: string; mc: string; mr: string;
  bl: string; br: string;
};

function clampDigits(s: string, max = 2): string {
  return s.replace(/\D+/g, "").slice(0, max);
}
function parsePanelString(s: string): Panel {
  const lines = (s || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const p: Panel = { tl: "", tr: "", ml: "", mc: "", mr: "", bl: "", br: "" };
  if (lines[0]) {
    const [tl, tr] = lines[0].split(/\s+/);
    p.tl = clampDigits(tl ?? "");
    p.tr = clampDigits(tr ?? "");
  }
  if (lines[1]) {
    const [ml, mc, mr] = lines[1].split(/\s+/);
    p.ml = clampDigits(ml ?? "");
    p.mc = clampDigits(mc ?? "");
    p.mr = clampDigits(mr ?? "");
  }
  if (lines[2]) {
    const [bl, br] = lines[2].split(/\s+/);
    p.bl = clampDigits(bl ?? "");
    p.br = clampDigits(br ?? "");
  }
  return p;
}
function panelToString(p: Panel): string {
  const l1 = [p.tl, p.tr].filter((v) => v !== "").join(" ");
  const l2 = [p.ml, p.mc, p.mr].filter((v) => v !== "").join(" ");
  const l3 = [p.bl, p.br].filter((v) => v !== "").join(" ");
  return `${l1}\n${l2}\n${l3}`.trimEnd();
}

/* read view for the panel (matches screenshot) */
function PanelView({ value }: { value: string }) {
  const p = parsePanelString(value);
  return (
    <div className="flex flex-col gap-[2px] md:gap-1 text-[var(--red)]">
      <div className="flex items-center justify-between">
        <span>{p.tl}</span>
        <span>{p.tr}</span>
      </div>
      <div className="grid grid-cols-3">
        <span className="justify-self-start">{p.ml}</span>
        <span className="justify-self-center">{p.mc}</span>
        <span className="justify-self-end">{p.mr}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>{p.bl}</span>
        <span>{p.br}</span>
      </div>
    </div>
  );
}

/* -------------- editable cell (digits-only 7 slots) -------------- */
function EditCell({
  initial = "",
  onSave,
  onClear,
}: {
  initial?: string;
  onSave: (v: string) => Promise<boolean>;
  onClear: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<Panel>(() => parsePanelString(initial));

  useEffect(() => {
    setPanel(parsePanelString(initial));
  }, [initial]);

  function setField<K extends keyof Panel>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setPanel((prev) => ({ ...prev, [key]: clampDigits(e.target.value, 2) }));
    };
  }

  async function handleSave() {
    const str = panelToString(panel);
    const ok = await onSave(str);
    if (ok) setEditing(false);
  }

  return (
    <td className="border-strong border-[var(--red)] px-1 md:px-2 py-2 md:py-3 align-top">
      {!editing ? (
        <button
          type="button"
          className="w-full min-h-[56px] md:min-h-[72px] text-[var(--red)]"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          <PanelView value={initial} />
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {/* top row */}
          <div className="grid grid-cols-2 gap-2">
            <input
              value={panel.tl}
              onChange={setField("tl")}
              inputMode="numeric"
              className="text-center border border-[var(--red)] bg-yellow-300/30 p-1"
              placeholder="TL"
            />
            <input
              value={panel.tr}
              onChange={setField("tr")}
              inputMode="numeric"
              className="text-center border border-[var(--red)] bg-yellow-300/30 p-1"
              placeholder="TR"
            />
          </div>
          {/* middle row */}
          <div className="grid grid-cols-3 gap-2">
            <input
              value={panel.ml}
              onChange={setField("ml")}
              inputMode="numeric"
              className="text-center border border-[var(--red)] bg-yellow-300/30 p-1"
              placeholder="ML"
            />
            <input
              value={panel.mc}
              onChange={setField("mc")}
              inputMode="numeric"
              className="text-center border border-[var(--red)] bg-yellow-300/30 p-1"
              placeholder="MC"
            />
            <input
              value={panel.mr}
              onChange={setField("mr")}
              inputMode="numeric"
              className="text-center border border-[var(--red)] bg-yellow-300/30 p-1"
              placeholder="MR"
            />
          </div>
          {/* bottom row */}
          <div className="grid grid-cols-2 gap-2">
            <input
              value={panel.bl}
              onChange={setField("bl")}
              inputMode="numeric"
              className="text-center border border-[var(--red)] bg-yellow-300/30 p-1"
              placeholder="BL"
            />
            <input
              value={panel.br}
              onChange={setField("br")}
              inputMode="numeric"
              className="text-center border border-[var(--red)] bg-yellow-300/30 p-1"
              placeholder="BR"
            />
          </div>

          <div className="flex gap-2">
            <button className="flex-1 bg-[var(--yellow)] border border-[var(--red)] text-[var(--red)] py-1" onClick={handleSave}>
              Save
            </button>
            <button
              className="px-3 bg-white border border-[var(--red)] text-[var(--red)]"
              onClick={() => {
                setPanel(parsePanelString(initial));
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              className="px-3 bg-red-100 border border-[var(--red)] text-[var(--red)]"
              onClick={async () => {
                if (!confirm("Clear this cell?")) return;
                await onClear();
                setEditing(false);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </td>
  );
}

/* --------- local fallback generator: full year, week rows, blank cells --------- */
function buildYearRows(year: number): Week[] {
  const rows: Week[] = [];
  let current = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  while (current <= end) {
    const weekStart = new Date(current);
    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push("");
      current = new Date(current);
      current.setDate(current.getDate() + 1);
      if (current > end && i < 6) {
        for (let j = i + 1; j < 7; j++) weekDays.push("");
        break;
      }
    }
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const capEnd = weekEnd > end ? end : weekEnd;
    const range = `${fmt(weekStart)} to ${fmt(capEnd)}`;
    rows.push({ range, days: weekDays });
  }
  return rows;
}
function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

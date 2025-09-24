"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

/* ---------------- types ---------------- */
type ChartType = "day" | "night";
type Week = { range: string; days: string[] };

type ApiChartOk = { ok: true; data: { weeks: Week[] } };
type ApiChartErr = { ok: false; error?: string };
type ApiChartResp = ApiChartOk | ApiChartErr;

type SaveResp = { ok: true; value: string } | { ok: false; error?: string };
type DelResp = { ok: true } | { ok: false; error?: string };

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

/* ---------------- panel layout ---------------- */


// allow digits & * # @ ; max 2 chars each slot
function clampToken(s: string, max = 2): string {
  return s.replace(/[^0-9*#@]/g, "").slice(0, max);
}
type Panel = {
  tl: string; tr: string;
  ml: string; mc: string; mr: string;
  bl: string; br: string;
};
function parsePanelString(s: string): Panel {
  const lines = (s || "").split("\n").map((l) => l.trim());
  const pick = (line: string, expected: number): string[] => {
    // New format: explicit positions with '|'
    if (line.includes("|")) {
      const parts = line.split("|");
      // trim to expected, pad with empties
      const out = parts.slice(0, expected).map((x) => clampToken(x));
      while (out.length < expected) out.push("");
      return out;
    }
    // Legacy format: whitespace tokens (ambiguous)
    const toks = line.split(/\s+/).filter(Boolean).map(clampToken);
    // place left->right; pad empties to keep length
    const out = toks.slice(0, expected);
    while (out.length < expected) out.push("");
    return out;
  };

  const [tl, tr] = pick(lines[0] ?? "", 2);
  const [ml, mc, mr] = pick(lines[1] ?? "", 3);
  const [bl, br] = pick(lines[2] ?? "", 2);

  return { tl, tr, ml, mc, mr, bl, br };
}
function panelToString(p: Panel): string {
  const l1 = `${p.tl}|${p.tr}`;
  const l2 = `${p.ml}|${p.mc}|${p.mr}`;
  const l3 = `${p.bl}|${p.br}`;
  return `${l1}\n${l2}\n${l3}`;
}

/* ---------------- read view ---------------- */
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

/* --------------- page ----------------- */
export default function ChartPage() {
  // narrow params safely
  const params = useParams<{ year?: string; type?: ChartType }>();
  const yearStr = params.year ?? "0";
  const type = (params.type ?? "day") as ChartType;
  const y = Number(yearStr);

  const title = (type === "day" ? "Jai Metro Day Chart " : "Jai Metro Night Chart ") + y;

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [offline, setOffline] = useState(false);

  // single-active editor (overlay)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorWI, setEditorWI] = useState<number | null>(null);
  const [editorDI, setEditorDI] = useState<number | null>(null);
  const [editorPanel, setEditorPanel] = useState<Panel>({ tl: "", tr: "", ml: "", mc: "", mr: "", bl: "", br: "" });
  const hasGlobalActive = editorOpen;

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
          setWeeks(buildYearRows(y)); // fallback
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

  function openEditor(wi: number, di: number, initial: string) {
    if (offline) return;
    if (hasGlobalActive) return;
    setEditorWI(wi);
    setEditorDI(di);
    setEditorPanel(parsePanelString(initial));
    setEditorOpen(true);
  }
  function closeEditor() {
    setEditorOpen(false);
    setEditorWI(null);
    setEditorDI(null);
  }

  async function saveEditor() {
    if (editorWI === null || editorDI === null) return;
    const value = panelToString(editorPanel);
    const res = await fetch("/api/chart/cell", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: y,
        type,
        weekIndex: editorWI,
        dayIndex: editorDI,
        value,
      }),
    });
    const data: SaveResp = await res.json();
    if (!data.ok) {
      alert(data.error || "Save failed");
      return;
    }
    setWeeks((prev) => {
      const copy = [...prev];
      copy[editorWI] = { ...copy[editorWI], days: [...copy[editorWI].days] };
      copy[editorWI].days[editorDI] = data.value;
      return copy;
    });
    closeEditor();
  }

  async function deleteEditor() {
    if (editorWI === null || editorDI === null) return;
    const url = `/api/chart/cell?year=${y}&type=${type}&weekIndex=${editorWI}&dayIndex=${editorDI}`;
    const res = await fetch(url, { method: "DELETE" });
    const data: DelResp = await res.json();
    if (!data.ok) {
      alert(data.error || "Delete failed");
      return;
    }
    setWeeks((prev) => {
      const copy = [...prev];
      copy[editorWI] = { ...copy[editorWI], days: [...copy[editorWI].days] };
      copy[editorWI].days[editorDI] = "";
      return copy;
    });
    closeEditor();
  }

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
          {hasGlobalActive && (
            <span className="text-xs md:text-sm bg-white/80 border border-[var(--red)] px-2 py-0.5 rounded">
              Editing — finish or cancel
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-4 text-center text-[var(--red)]">Loading…</div>
        ) : (
          <>
            {err && <div className="px-3 py-2 text-center text-[var(--red)] text-xs md:text-sm">{err}</div>}

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
                    {w.days.map((val, di) => {
                      const locked = hasGlobalActive || offline;
                      return (
                        <td key={di} className="border-strong border-[var(--red)] px-1 md:px-2 py-2 md:py-3 align-top">
                          <button
                            type="button"
                            onClick={() => openEditor(wi, di, val)}
                            className={`w-full min-h-[56px] md:min-h-[72px] text-[var(--red)] ${
                              locked ? "opacity-40 cursor-not-allowed pointer-events-none" : ""
                            }`}
                            aria-disabled={locked}
                            tabIndex={locked ? -1 : 0}
                            title={locked ? "Finish current edit to edit another cell" : "Click to edit"}
                          >
                            <PanelView value={val} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* --------- FULLSCREEN OVERLAY EDITOR --------- */}
   {editorOpen && editorWI !== null && editorDI !== null && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-3">
    {/* sheet/card */}
    <div className="w-full max-w-[520px] bg-[var(--yellow)] border-strong border-[var(--red)] rounded-2xl shadow-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[var(--red)] text-xl sm:text-2xl font-semibold">
          Edit Cell — Week {editorWI + 1},{" "}
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][editorDI]}
        </h3>
        <button
          onClick={closeEditor}
          className="text-[var(--red)] border border-[var(--red)] px-3 py-1 rounded"
        >
          ✕
        </button>
      </div>

      {/* big preview */}
       

      {/* inputs grid large tap targets */}
      <div className="flex flex-col gap-3">
        {/* top row (3 equal cols; inputs in col 1 and 3) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-start-1">
            <BigInput
              value={editorPanel.tl}
              onChange={(v) => setEditorPanel((p) => ({ ...p, tl: clampToken(v) }))}
            />
          </div>
          <div className="col-start-3">
            <BigInput
               
              value={editorPanel.tr}
              onChange={(v) => setEditorPanel((p) => ({ ...p, tr: clampToken(v) }))}
            />
          </div>
        </div>

        {/* middle row (3 equal cols; inputs in 1/2/3) */}
        <div className="grid grid-cols-3 gap-3">
          <BigInput
             
            value={editorPanel.ml}
            onChange={(v) => setEditorPanel((p) => ({ ...p, ml: clampToken(v) }))}
          />
          <BigInput
            value={editorPanel.mc}
            onChange={(v) => setEditorPanel((p) => ({ ...p, mc: clampToken(v) }))}
          />
          <BigInput
            value={editorPanel.mr}
            onChange={(v) => setEditorPanel((p) => ({ ...p, mr: clampToken(v) }))}
          />
        </div>

        {/* bottom row (3 equal cols; inputs in col 1 and 3) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-start-1">
            <BigInput
               
              value={editorPanel.bl}
              onChange={(v) => setEditorPanel((p) => ({ ...p, bl: clampToken(v) }))}
            />
          </div>
          <div className="col-start-3">
            <BigInput
               
              value={editorPanel.br}
              onChange={(v) => setEditorPanel((p) => ({ ...p, br: clampToken(v) }))}
            />
          </div>
        </div>
      </div>

      {/* actions: all equal width */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <button
          className="w-full bg-[var(--yellow)] border border-[var(--red)] text-[var(--red)] py-2 sm:py-3 rounded"
          onClick={saveEditor}
        >
          Save
        </button>
        <button
          className="w-full bg-white border border-[var(--red)] text-[var(--red)] rounded py-2 sm:py-3"
          onClick={closeEditor}
        >
          Cancel
        </button>
        <button
          className="w-full bg-red-100 border border-[var(--red)] text-[var(--red)] rounded py-2 sm:py-3"
          onClick={() => {
            if (confirm("Clear this cell?")) deleteEditor();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}


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
function BigInput({
  value,
  onChange,
}: {
  
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 w-full min-w-0">
      
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="w-full min-w-0 text-center text-2xl sm:text-3xl tracking-wider
                   border border-[var(--red)] bg-yellow-300/30 rounded
                   h-14 sm:h-16 px-3"
        placeholder=".."
      />
    </label>
  );
}



/* --------- local fallback generator: full year, week rows, blank cells --------- */
// in app/chart/[year]/[type]/page.tsx
function buildYearRows(year: number): { range: string; days: string[] }[] {
  const rows: { range: string; days: string[] }[] = [];

  const dUTC = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
  const addDaysUTC = (dt: Date, days: number) => new Date(dt.getTime() + days * 86_400_000);
  const fmtUTC = (dt: Date) => dt.toISOString().slice(0, 10);

  let start = dUTC(year, 0, 1);
  const yearEnd = dUTC(year, 11, 31);

  while (start <= yearEnd) {
    const dow = start.getUTCDay(); // 0=Sun
    const daysToSunday = dow === 0 ? 0 : 7 - dow;
    let end = addDaysUTC(start, daysToSunday);
    if (end > yearEnd) end = yearEnd;

    rows.push({ range: `${fmtUTC(start)} to ${fmtUTC(end)}`, days: ["","","","","","",""] });
    start = addDaysUTC(end, 1);
  }
  return rows;
}
function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

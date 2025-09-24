
export type WeekRow = { range: string; days: string[] };

// UTC helpers avoid timezone shifts
function dUTC(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}
function addDaysUTC(dt: Date, days: number): Date {
  return new Date(dt.getTime() + days * 86_400_000);
}
function fmtUTC(dt: Date): string {
  // YYYY-MM-DD in UTC
  return dt.toISOString().slice(0, 10);
}

export function buildYearRows(year: number): WeekRow[] {
  const rows: WeekRow[] = [];
  let start = dUTC(year, 0, 1);       // Jan 1 (UTC)
  const yearEnd = dUTC(year, 11, 31); // Dec 31 (UTC)

  while (start <= yearEnd) {
    // 0=Sun,1=Mon,...6=Sat — in UTC
    const dow = start.getUTCDay();
    const daysToSunday = dow === 0 ? 0 : 7 - dow;
    let end = addDaysUTC(start, daysToSunday);

    if (end > yearEnd) end = yearEnd; // cap last row at Dec 31

    rows.push({
      range: `${fmtUTC(start)} to ${fmtUTC(end)}`,
      days: ["", "", "", "", "", "", ""], // Mon..Sun cells (content blank)
    });

    start = addDaysUTC(end, 1); // next week starts next day
  }

  return rows;
}
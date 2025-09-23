export function buildYearRows(year: number) {
  const rows: { range: string; days: string[] }[] = [];
  let current = new Date(year, 0, 1);
  const end   = new Date(year, 11, 31);

  while (current <= end) {
    const weekStart = new Date(current);
    const weekDays: string[] = [];
    for (let i=0;i<7;i++){
      weekDays.push(""); // empty cells now
      current = new Date(current);
      current.setDate(current.getDate()+1);
      if (current > end && i < 6) { for (let j=i+1;j<7;j++) weekDays.push(""); break; }
    }
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
    const capEnd  = weekEnd > end ? end : weekEnd;
    rows.push({ range: `${iso(weekStart)} to ${iso(capEnd)}`, days: weekDays });
  }
  return rows;
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

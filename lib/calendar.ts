// Calendar grid helpers for M6. Dates are keyed in UTC (`toISOString().slice(0, 10)`)
// rather than server-local time, since the container's local timezone isn't
// guaranteed and event_datetime is stored with an explicit timezone anyway.
export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseMonthParam(month: string | undefined): { year: number; month: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNum] = month.split("-").map(Number);
    return { year, month: monthNum - 1 };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

export function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type CalendarCell = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

// Always returns 42 cells (6 weeks), Sunday-first, so the grid height is stable.
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startOffset = firstOfMonth.getUTCDay();

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(year, month, 1 - startOffset + i));
    return {
      date,
      dateKey: dateKey(date),
      inCurrentMonth: date.getUTCMonth() === month,
    };
  });
}

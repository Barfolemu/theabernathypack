import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildMonthGrid, monthLabel, monthParam } from "@/lib/calendar";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type EventCalendarProps = {
  year: number;
  month: number; // 0-indexed
  selectedDate?: string;
  eventCountsByDate: Map<string, number>;
  size: "mini" | "full";
  basePath: string;
  // Other query params (e.g. `view`) to preserve across month/date navigation.
  preserveParams?: Record<string, string>;
};

function hrefFor(
  basePath: string,
  preserveParams: Record<string, string>,
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams(preserveParams);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function EventCalendar({
  year,
  month,
  selectedDate,
  eventCountsByDate,
  size,
  basePath,
  preserveParams = {},
}: EventCalendarProps) {
  const cells = buildMonthGrid(year, month);
  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const isMini = size === "mini";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Link
          href={hrefFor(basePath, preserveParams, { month: monthParam(prevMonth.year, prevMonth.month) })}
          aria-label="Previous month"
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          ‹
        </Link>
        <span className={cn("font-medium", isMini ? "text-sm" : "text-base")}>
          {monthLabel(year, month)}
        </span>
        <Link
          href={hrefFor(basePath, preserveParams, { month: monthParam(nextMonth.year, nextMonth.month) })}
          aria-label="Next month"
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          ›
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const count = eventCountsByDate.get(cell.dateKey) ?? 0;
          const isSelected = cell.dateKey === selectedDate;
          const dayNumber = cell.date.getUTCDate();

          if (!cell.inCurrentMonth) {
            return <div key={cell.dateKey} aria-hidden />;
          }

          return (
            <Link
              key={cell.dateKey}
              href={hrefFor(basePath, preserveParams, {
                date: isSelected ? undefined : cell.dateKey,
              })}
              className={cn(
                "flex flex-col items-center justify-center rounded-md text-sm",
                isMini ? "aspect-square" : "aspect-square gap-0.5",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : count > 0
                    ? "bg-muted hover:bg-muted/70"
                    : "hover:bg-muted/50",
              )}
            >
              <span>{dayNumber}</span>
              {count > 0 && !isMini && (
                <span
                  className={cn(
                    "text-[0.65rem]",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {count} {count === 1 ? "event" : "events"}
                </span>
              )}
              {count > 0 && isMini && (
                <span
                  className={cn(
                    "size-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary",
                  )}
                />
              )}
            </Link>
          );
        })}
      </div>

      {selectedDate && (
        <Link
          href={hrefFor(basePath, preserveParams, { date: undefined })}
          className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Clear date filter
        </Link>
      )}
    </div>
  );
}

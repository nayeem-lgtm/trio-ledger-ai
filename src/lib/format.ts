export const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const fmtMoney = (n: number) => USD.format(n || 0);
export const fmtMonth = (d: Date) =>
  d.toLocaleString("en-US", { month: "long", year: "numeric" });
export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const isoDay = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const monthRange = (year: number, month: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start: isoDay(start), end: isoDay(end) };
};

export type DateRange = { from: Date; to: Date };

/** end is INCLUSIVE in UI, but exported as exclusive ISO string for SQL filters. */
export const rangeToIso = (r: DateRange) => {
  const endExclusive = new Date(r.to);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start: isoDay(r.from), end: isoDay(endExclusive) };
};

export const fmtRange = (r: DateRange) => {
  const sameYear = r.from.getFullYear() === r.to.getFullYear();
  const fOpts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" };
  const tOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  if (isoDay(r.from) === isoDay(r.to)) {
    return r.from.toLocaleDateString("en-US", tOpts);
  }
  return `${r.from.toLocaleDateString("en-US", fOpts)} – ${r.to.toLocaleDateString("en-US", tOpts)}`;
};

/** Returns the same-length range immediately preceding `r`. */
export const previousRange = (r: DateRange): DateRange => {
  const days = Math.round((r.to.getTime() - r.from.getTime()) / 86_400_000) + 1;
  const to = new Date(r.from);
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
};

export type PresetKey =
  | "this_month"
  | "last_month"
  | "last_7"
  | "last_30"
  | "last_90"
  | "ytd"
  | "last_year"
  | "all_time";

export const buildPreset = (key: PresetKey, now = new Date()): DateRange => {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "this_month":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
    case "last_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
    case "last_7": {
      const to = new Date(now);
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from, to };
    }
    case "last_30": {
      const to = new Date(now);
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from, to };
    }
    case "last_90": {
      const to = new Date(now);
      const from = new Date(now);
      from.setDate(from.getDate() - 89);
      return { from, to };
    }
    case "ytd":
      return { from: new Date(y, 0, 1), to: new Date(now) };
    case "last_year":
      return { from: new Date(y - 1, 0, 1), to: new Date(y - 1, 11, 31) };
    case "all_time":
      return { from: new Date(2000, 0, 1), to: new Date(now) };
  }
};

export const PRESET_LABEL: Record<PresetKey, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_7: "Last 7 days",
  last_30: "Last 30 days",
  last_90: "Last 90 days",
  ytd: "Year to date",
  last_year: "Last year",
  all_time: "All time",
};

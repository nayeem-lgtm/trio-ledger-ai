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
export const monthRange = (year: number, month: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
};

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { businessesQuery, transactionsQuery } from "@/lib/queries";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fmtMoney,
  fmtRange,
  buildPreset,
  rangeToIso,
  previousRange,
  isoDay,
  type DateRange,
} from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowUpRight, Activity } from "lucide-react";
import { TransactionDialog } from "@/components/TransactionDialog";
import { DateRangePicker } from "@/components/DateRangePicker";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Overview,
});

function Overview() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(() => buildPreset("this_month"));

  const { start, end } = rangeToIso(range);
  const prevRange = previousRange(range);
  const prevIso = rangeToIso(prevRange);

  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: txns = [] } = useQuery(transactionsQuery());

  const inMonth = useMemo(
    () => txns.filter((t) => t.transaction_date >= start && t.transaction_date < end),
    [txns, start, end],
  );
  const inPrev = useMemo(
    () => txns.filter((t) => t.transaction_date >= prevIso.start && t.transaction_date < prevIso.end),
    [txns, prevIso.start, prevIso.end],
  );

  const sum = (rows: any[], type: string) =>
    rows.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0);

  const totals = useMemo(() => {
    const income = sum(inMonth, "income");
    const expense = sum(inMonth, "expense");
    const pIncome = sum(inPrev, "income");
    const pExpense = sum(inPrev, "expense");
    const pNet = pIncome - pExpense;
    return {
      income,
      expense,
      net: income - expense,
      dIncome: pIncome ? ((income - pIncome) / pIncome) * 100 : 0,
      dExpense: pExpense ? ((expense - pExpense) / pExpense) * 100 : 0,
      dNet: pNet ? (((income - expense) - pNet) / Math.abs(pNet)) * 100 : 0,
    };
  }, [inMonth, inPrev]);

  const perBiz = useMemo(() => {
    return businesses.map((b) => {
      const rows = inMonth.filter((t) => t.business_id === b.id);
      const income = sum(rows, "income");
      const expense = sum(rows, "expense");
      return { ...b, income, expense, net: income - expense, txns: rows.length };
    });
  }, [businesses, inMonth]);

  const trend = useMemo(() => {
    const out: { month: string; income: number; expense: number; net: number }[] = [];
    const anchor = range.to;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const monthStart = isoDay(d);
      const monthEnd = isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 1));
      const rows = txns.filter((t) => t.transaction_date >= monthStart && t.transaction_date < monthEnd);
      const inc = sum(rows, "income");
      const exp = sum(rows, "expense");
      out.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }
    return out;
  }, [txns, range.to]);

  const recent = useMemo(() => txns.slice(0, 6), [txns]);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex items-end justify-between flex-wrap gap-4 pb-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Consolidated Overview
          </div>
          <h1 className="font-display text-[34px] leading-none font-semibold tracking-tight">
            {fmtRange(range)}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {businesses.length} entities · {inMonth.length} transactions this period
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <DateRangePicker value={range} onChange={setRange} />
          <Button onClick={() => setOpen(true)} className="gap-2 shadow-soft">
            <Plus className="h-4 w-4" /> Record entry
          </Button>
        </div>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(0,auto)]">
        {/* KPI row */}
        <KpiTile
          className="col-span-12 md:col-span-4"
          label="Revenue"
          value={totals.income}
          delta={totals.dIncome}
          icon={TrendingUp}
          tone="primary"
        />
        <KpiTile
          className="col-span-12 md:col-span-4"
          label="Expenses"
          value={totals.expense}
          delta={totals.dExpense}
          icon={TrendingDown}
          tone="destructive"
          invertDelta
        />
        <KpiTile
          className="col-span-12 md:col-span-4"
          label="Net Profit"
          value={totals.net}
          delta={totals.dNet}
          icon={Wallet}
          tone={totals.net >= 0 ? "primary" : "destructive"}
        />

        {/* Trend — wide */}
        <Card className="col-span-12 lg:col-span-8 gradient-card border-border/60 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Performance · trailing 6 months
                </div>
                <div className="font-display text-lg font-semibold mt-1">Cash flow trajectory</div>
              </div>
              <div className="flex gap-4 text-xs">
                <LegendDot color="var(--primary)" label="Revenue" />
                <LegendDot color="var(--destructive)" label="Expense" />
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.6 0.115 250)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="oklch(0.6 0.115 250)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gEx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.2 27)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="oklch(0.62 0.2 27)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="currentColor" opacity={0.08} vertical={false} />
                  <XAxis dataKey="month" stroke="currentColor" opacity={0.5} tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="currentColor" opacity={0.5} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: "var(--shadow-elevated)",
                    }}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                  <Area type="monotone" dataKey="income" stroke="oklch(0.6 0.115 250)" strokeWidth={2} fill="url(#gIn)" />
                  <Area type="monotone" dataKey="expense" stroke="oklch(0.62 0.2 27)" strokeWidth={2} fill="url(#gEx)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue split */}
        <Card className="col-span-12 lg:col-span-4 border-border/60 shadow-soft">
          <CardContent className="p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Revenue allocation
            </div>
            <div className="font-display text-lg font-semibold mt-1 mb-3">By entity</div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={perBiz.filter((b) => b.income > 0)}
                    dataKey="income"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                    stroke="var(--background)"
                    strokeWidth={2}
                  >
                    {perBiz.map((b) => (<Cell key={b.id} fill={b.color} />))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => fmtMoney(v)}
                    contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-3">
              {perBiz.map((b) => {
                const pct = totals.income > 0 ? (b.income / totals.income) * 100 : 0;
                return (
                  <div key={b.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-foreground/80">{b.name}</span>
                    </div>
                    <span className="font-mono tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Entities */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-display text-base font-semibold">Entity performance</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">This period</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {perBiz.map((b) => (
              <Link key={b.id} to="/business/$businessId" params={{ businessId: b.id }} className="group">
                <Card className="border-border/60 hover:border-primary/40 transition-all hover:shadow-elevated h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="h-8 w-1 rounded-full" style={{ backgroundColor: b.color }} />
                        <div>
                          <div className="font-medium text-[15px]">{b.name}</div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            {b.txns} entries
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                      <Metric label="Revenue" value={b.income} tone="primary" />
                      <Metric label="Expenses" value={b.expense} tone="destructive" />
                      <Metric label="Net" value={b.net} tone={b.net >= 0 ? "primary" : "destructive"} bold />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <Card className="col-span-12 lg:col-span-4 border-border/60 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Activity</div>
                <div className="font-display text-base font-semibold mt-1">Recent ledger</div>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {recent.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">No transactions yet</div>
              ) : recent.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="h-7 w-7 rounded-md grid place-items-center shrink-0" style={{ backgroundColor: `${t.businesses?.color}22` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.businesses?.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-foreground/90 text-[13px]">{t.vendor ?? t.categories?.name ?? "Entry"}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.businesses?.name} · {t.transaction_date}</div>
                  </div>
                  <div className={cn("text-[13px] font-mono tabular-nums font-medium", t.type === "income" ? "text-primary" : "text-destructive")}>
                    {t.type === "income" ? "+" : "−"}{fmtMoney(Number(t.amount))}
                  </div>
                </div>
              ))}
            </div>
            <Link to="/transactions" className="mt-4 block text-center text-xs text-primary hover:underline">
              View all transactions →
            </Link>
          </CardContent>
        </Card>
      </div>

      <TransactionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function KpiTile({
  className,
  label,
  value,
  delta,
  icon: Icon,
  tone,
  invertDelta,
}: {
  className?: string;
  label: string;
  value: number;
  delta: number;
  icon: any;
  tone: "primary" | "destructive";
  invertDelta?: boolean;
}) {
  const positiveDelta = invertDelta ? delta < 0 : delta >= 0;
  const accent = tone === "primary" ? "text-primary" : "text-destructive";
  return (
    <Card className={cn("border-border/60 shadow-soft relative overflow-hidden", className)}>
      <div className={cn("absolute top-0 left-0 right-0 h-px", tone === "primary" ? "bg-primary/40" : "bg-destructive/40")} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
          <Icon className={cn("h-4 w-4", accent)} />
        </div>
        <div className={cn("mt-3 font-display text-[32px] leading-none font-semibold tracking-tight tabular-nums", accent)}>
          {fmtMoney(value)}
        </div>
        {Number.isFinite(delta) && delta !== 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className={cn("font-mono tabular-nums px-1.5 py-0.5 rounded", positiveDelta ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10")}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone, bold }: { label: string; value: number; tone: "primary" | "destructive"; bold?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-1 font-mono tabular-nums text-sm",
        bold && "font-semibold",
        tone === "primary" ? "text-primary" : "text-destructive",
      )}>
        {fmtMoney(value)}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

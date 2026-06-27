import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { businessesQuery, categoriesQuery, transactionsQuery } from "@/lib/queries";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtMonth, monthRange } from "@/lib/format";
import { Plus, FileDown, FileSpreadsheet, TrendingUp, TrendingDown, Wallet, Sparkles, Loader2 } from "lucide-react";
import { TransactionDialog } from "@/components/TransactionDialog";
import { downloadCSV, downloadPDF, type ReportTxn } from "@/lib/reports";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { monthlyInsight } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/business/$businessId")({
  component: BusinessPage,
});

function BusinessPage() {
  const { businessId } = Route.useParams();
  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: txns = [] } = useQuery(transactionsQuery(businessId));

  const business = businesses.find((b) => b.id === businessId);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [open, setOpen] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const insightFn = useServerFn(monthlyInsight);

  const { start, end } = monthRange(year, month);
  const monthDate = new Date(year, month, 1);

  const monthTxns = useMemo(
    () => txns.filter((t) => t.transaction_date >= start && t.transaction_date < end),
    [txns, start, end],
  );

  const totals = useMemo(() => {
    const income = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, net: income - expense };
  }, [monthTxns]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; total: number; type: "income" | "expense"; color: string }>();
    monthTxns.forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      const name = cat?.name ?? "Uncategorized";
      const key = `${t.type}-${name}`;
      const prev = map.get(key);
      map.set(key, {
        name,
        total: (prev?.total ?? 0) + Number(t.amount),
        type: t.type,
        color: cat?.color ?? "#64748b",
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [monthTxns, categories]);

  const trend = useMemo(() => {
    const out: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      const r = monthRange(d.getFullYear(), d.getMonth());
      const rows = txns.filter((t) => t.transaction_date >= r.start && t.transaction_date < r.end);
      out.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        income: rows.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
        expense: rows.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return out;
  }, [txns, year, month]);

  if (!business && businesses.length > 0) throw notFound();
  if (!business) return null;

  const reportRows: ReportTxn[] = monthTxns.map((t: any) => ({
    transaction_date: t.transaction_date,
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    vendor: t.vendor,
    category_name: t.categories?.name ?? null,
    business_name: business.name,
  }));

  const downloadPdf = () => {
    downloadPDF({
      filename: `${business.name}-${fmtMonth(monthDate)}.pdf`,
      title: `${business.name} — Monthly Report`,
      subtitle: fmtMonth(monthDate),
      totals,
      byCategory: byCategory.map((c) => ({ name: c.name, total: c.total, type: c.type })),
      rows: reportRows,
    });
  };

  const downloadXls = () => {
    downloadCSV(`${business.name}-${fmtMonth(monthDate)}.csv`, reportRows);
  };

  const generateInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await insightFn({
        data: {
          businessName: business.name,
          monthLabel: fmtMonth(monthDate),
          income: totals.income,
          expense: totals.expense,
          topExpenses: byCategory.filter((c) => c.type === "expense").slice(0, 8).map((c) => ({ name: c.name, total: c.total })),
        },
      });
      setInsight(res.insight);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate insight");
    } finally {
      setInsightLoading(false);
    }
  };

  const years = [today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear()];
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: business.color }} />
            <h1 className="text-3xl font-semibold tracking-tight">{business.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{fmtMonth(monthDate)}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {new Date(2000, m, 1).toLocaleString("en-US", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadPdf} className="gap-2"><FileDown className="h-4 w-4" />PDF</Button>
          <Button variant="outline" onClick={downloadXls} className="gap-2"><FileSpreadsheet className="h-4 w-4" />CSV</Button>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat icon={TrendingUp} label="Revenue" value={totals.income} accent="text-primary" />
        <Stat icon={TrendingDown} label="Expenses" value={totals.expense} accent="text-destructive" />
        <Stat icon={Wallet} label="Net Profit" value={totals.net} accent={totals.net >= 0 ? "text-primary" : "text-destructive"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>6-month trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" stroke="currentColor" opacity={0.6} />
                <YAxis stroke="currentColor" opacity={0.6} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtMoney(v)} />
                <Legend />
                <Bar dataKey="income" fill="oklch(0.72 0.16 158)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="oklch(0.65 0.22 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expense breakdown</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory.filter((c) => c.type === "expense")}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {byCategory.filter((c) => c.type === "expense").map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Monthly Insight</CardTitle>
          <Button size="sm" variant="secondary" onClick={generateInsight} disabled={insightLoading}>
            {insightLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate"}
          </Button>
        </CardHeader>
        <CardContent>
          {insight ? (
            <p className="text-sm leading-relaxed">{insight}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Click Generate for an AI-written summary of this month's performance.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {monthTxns.slice(0, 20).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-8 w-8 rounded-md grid place-items-center text-xs font-semibold"
                    style={{ backgroundColor: (t.categories?.color ?? "#64748b") + "33", color: t.categories?.color ?? "#64748b" }}
                  >
                    {t.type === "income" ? "+" : "−"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.vendor ?? t.description ?? t.categories?.name ?? "Transaction"}</div>
                    <div className="text-xs text-muted-foreground">{t.transaction_date} · {t.categories?.name ?? "Uncategorized"}</div>
                  </div>
                </div>
                <div className={`font-semibold ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                  {t.type === "income" ? "+" : "−"}{fmtMoney(Number(t.amount))}
                </div>
              </div>
            ))}
            {monthTxns.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No transactions yet for this month.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionDialog open={open} onOpenChange={setOpen} defaultBusinessId={businessId} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <div className={`mt-2 text-3xl font-semibold tracking-tight ${accent}`}>{fmtMoney(value)}</div>
      </CardContent>
    </Card>
  );
}

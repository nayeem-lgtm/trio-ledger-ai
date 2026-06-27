import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { businessesQuery, transactionsQuery } from "@/lib/queries";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtMonth, monthRange } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowRight, DollarSign } from "lucide-react";
import { TransactionDialog } from "@/components/TransactionDialog";
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

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Overview,
});

function Overview() {
  const [open, setOpen] = useState(false);
  const [now] = useState(() => new Date());
  const { start, end } = monthRange(now.getFullYear(), now.getMonth());

  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: txns = [] } = useQuery(transactionsQuery());

  const inMonth = useMemo(
    () => txns.filter((t) => t.transaction_date >= start && t.transaction_date < end),
    [txns, start, end],
  );

  const totals = useMemo(() => {
    const income = inMonth.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, net: income - expense };
  }, [inMonth]);

  const perBiz = useMemo(() => {
    return businesses.map((b) => {
      const rows = inMonth.filter((t) => t.business_id === b.id);
      const income = rows.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expense = rows.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { ...b, income, expense, net: income - expense };
    });
  }, [businesses, inMonth]);

  // 6-month trend
  const trend = useMemo(() => {
    const out: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const r = monthRange(d.getFullYear(), d.getMonth());
      const rows = txns.filter((t) => t.transaction_date >= r.start && t.transaction_date < r.end);
      out.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        income: rows.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
        expense: rows.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return out;
  }, [txns, now]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">All businesses · {fmtMonth(now)}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add transaction
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Revenue" value={totals.income} accent="text-primary" />
        <StatCard icon={TrendingDown} label="Expenses" value={totals.expense} accent="text-destructive" />
        <StatCard icon={Wallet} label="Net Profit" value={totals.net} accent={totals.net >= 0 ? "text-primary" : "text-destructive"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>6-month trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="currentColor" opacity={0.6} />
                <YAxis stroke="currentColor" opacity={0.6} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => fmtMoney(v)}
                />
                <Legend />
                <Bar dataKey="income" fill="oklch(0.72 0.16 158)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="oklch(0.65 0.22 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue split</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={perBiz.filter((b) => b.income > 0)}
                  dataKey="income"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {perBiz.map((b) => (<Cell key={b.id} fill={b.color} />))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Businesses this month</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {perBiz.map((b) => (
            <Link key={b.id} to="/business/$businessId" params={{ businessId: b.id }}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="font-medium">{b.name}</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Revenue</div>
                      <div className="font-semibold">{fmtMoney(b.income)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Expenses</div>
                      <div className="font-semibold">{fmtMoney(b.expense)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Net</div>
                      <div className={`font-semibold ${b.net >= 0 ? "text-primary" : "text-destructive"}`}>{fmtMoney(b.net)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <TransactionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
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

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Download, Shield } from "lucide-react";
import { fmtMoney, buildPreset, rangeToIso, type DateRange } from "@/lib/format";
import { DateRangePicker } from "@/components/DateRangePicker";
import { downloadCSV } from "@/lib/reports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/insurance-report")({
  component: InsuranceReport,
});

type ColType = "text" | "number" | "date" | "bool";
type Col = { key: string; label: string; type: ColType; width?: number };

const SHEETS = {
  sales: {
    label: "Sales Log",
    table: "insurance_sales" as const,
    cols: [
      { key: "sale_date", label: "Date", type: "date", width: 130 },
      { key: "week_start", label: "Week Start", type: "date", width: 130 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "ringba_target", label: "Ringba Target", type: "text" },
      { key: "product", label: "Product", type: "text" },
      { key: "carrier", label: "Carrier", type: "text" },
      { key: "policy_amount", label: "Policy Amount", type: "number" },
      { key: "monthly_premium", label: "Monthly Premium", type: "number" },
      { key: "sale_status", label: "Status", type: "text" },
      { key: "count_sale", label: "Count?", type: "bool" },
      { key: "personal_lead_incentive", label: "Personal Lead $", type: "number" },
      { key: "policy_start_date", label: "Policy Start", type: "date", width: 130 },
      { key: "notes", label: "Notes", type: "text", width: 220 },
    ] as Col[],
    dateKey: "sale_date",
  },
  calltools: {
    label: "CallTools",
    table: "insurance_calltools" as const,
    cols: [
      { key: "entry_date", label: "Date", type: "date", width: 130 },
      { key: "week_start", label: "Week Start", type: "date", width: 130 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "total_dispositions", label: "Total Disp.", type: "number" },
      { key: "customer_hang_up", label: "Hang Up", type: "number" },
      { key: "call_back_scheduled", label: "Callback Sched.", type: "number" },
      { key: "busy_call_back_later", label: "Busy/Later", type: "number" },
      { key: "goal_disposition", label: "Goal Disp.", type: "number" },
      { key: "not_interested", label: "Not Interested", type: "number" },
      { key: "no_contact", label: "No Contact", type: "number" },
      { key: "notes", label: "Notes", type: "text", width: 220 },
    ] as Col[],
    dateKey: "entry_date",
  },
  ringba: {
    label: "Ringba",
    table: "insurance_ringba" as const,
    cols: [
      { key: "entry_date", label: "Date", type: "date", width: 130 },
      { key: "week_start", label: "Week Start", type: "date", width: 130 },
      { key: "agent", label: "Agent/Owner", type: "text" },
      { key: "ringba_target", label: "Target", type: "text" },
      { key: "incoming", label: "Incoming", type: "number" },
      { key: "completed", label: "Completed", type: "number" },
      { key: "connected", label: "Connected", type: "number" },
      { key: "paid_calls", label: "Paid Calls", type: "number" },
      { key: "cost_to_ray", label: "Cost", type: "number" },
      { key: "paid_out_pct", label: "Paid Out %", type: "number" },
      { key: "acl", label: "ACL", type: "number" },
      { key: "ringba_sales", label: "Ringba Sales", type: "number" },
      { key: "notes", label: "Notes", type: "text", width: 220 },
    ] as Col[],
    dateKey: "entry_date",
  },
  paid_qa: {
    label: "Paid Call QA",
    table: "insurance_paid_qa" as const,
    cols: [
      { key: "entry_date", label: "Date", type: "date", width: 130 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "ringba_target", label: "Target", type: "text" },
      { key: "caller_id", label: "Caller ID", type: "text" },
      { key: "paid_call_cost", label: "Cost", type: "number" },
      { key: "duration", label: "Duration", type: "text" },
      { key: "qa_status", label: "QA Status", type: "text" },
      { key: "sale_outcome", label: "Outcome", type: "text" },
      { key: "loss_reason", label: "Loss Reason", type: "text" },
      { key: "callback_needed", label: "Callback?", type: "bool" },
      { key: "follow_up_owner", label: "Follow-up", type: "text" },
      { key: "notes", label: "Notes", type: "text", width: 220 },
    ] as Col[],
    dateKey: "entry_date",
  },
  agent_daily: {
    label: "Agent Daily",
    table: "insurance_agent_daily" as const,
    cols: [
      { key: "entry_date", label: "Date", type: "date", width: 130 },
      { key: "week_start", label: "Week Start", type: "date", width: 130 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "shift_hours", label: "Shift Hours", type: "number" },
      { key: "manager_score", label: "Mgr Score", type: "number" },
      { key: "manager_notes", label: "Notes", type: "text", width: 260 },
    ] as Col[],
    dateKey: "entry_date",
  },
  agents: {
    label: "Agents",
    table: "insurance_agents" as const,
    cols: [
      { key: "name", label: "Agent Name", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "notes", label: "Notes", type: "text", width: 280 },
    ] as Col[],
    dateKey: null,
  },
  tiers: {
    label: "Commission Tiers",
    table: "insurance_commission_tiers" as const,
    cols: [
      { key: "tier_name", label: "Tier", type: "text" },
      { key: "min_sales", label: "Min Sales", type: "number" },
      { key: "max_sales", label: "Max Sales", type: "number" },
      { key: "commission_per_sale", label: "$/Sale", type: "number" },
      { key: "notes", label: "Notes", type: "text", width: 280 },
    ] as Col[],
    dateKey: null,
  },
} as const;

type SheetKey = keyof typeof SHEETS;

function InsuranceReport() {
  const [tab, setTab] = useState<SheetKey | "summary">("summary");
  const [range, setRange] = useState<DateRange>(() => buildPreset("this_month"));

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2 flex items-center gap-2">
            <Shield className="h-3 w-3" /> Insurance · Reporting Suite
          </div>
          <h1 className="font-display text-[32px] leading-none font-semibold tracking-tight">
            Policy Bear Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Editable spreadsheets for sales, calls, QA, payroll and executive dashboard.
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="summary">CEO Dashboard</TabsTrigger>
          <TabsTrigger value="payroll">Weekly Payroll</TabsTrigger>
          {(Object.keys(SHEETS) as SheetKey[]).map((k) => (
            <TabsTrigger key={k} value={k}>{SHEETS[k].label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <CeoDashboard range={range} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6">
          <PayrollView range={range} />
        </TabsContent>
        {(Object.keys(SHEETS) as SheetKey[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-6">
            <SheetGrid sheetKey={k} range={range} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ---------- Editable spreadsheet-like grid ---------- */

function SheetGrid({ sheetKey, range }: { sheetKey: SheetKey; range: DateRange }) {
  const cfg = SHEETS[sheetKey];
  const qc = useQueryClient();
  const { start, end } = rangeToIso(range);

  const client = supabase as any;
  const { data: rows = [] } = useQuery({
    queryKey: ["ins", cfg.table, cfg.dateKey ? { start, end } : null],
    queryFn: async () => {
      let q = client.from(cfg.table).select("*").order("created_at", { ascending: false }).limit(1000);
      if (cfg.dateKey) q = q.gte(cfg.dateKey, start).lt(cfg.dateKey, end);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ins", cfg.table] });

  const addRow = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const seed: Record<string, any> = { owner_id: u.user.id };
    if (cfg.dateKey) seed[cfg.dateKey] = new Date().toISOString().slice(0, 10);
    if (cfg.cols.some((c) => c.key === "week_start")) {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      seed.week_start = d.toISOString().slice(0, 10);
    }
    await client.from(cfg.table).insert(seed);
    invalidate();
  };

  const updateCell = async (id: string, key: string, value: any) => {
    await client.from(cfg.table).update({ [key]: value }).eq("id", id);
    invalidate();
  };

  const deleteRow = async (id: string) => {
    await client.from(cfg.table).delete().eq("id", id);
    invalidate();
  };

  const exportCsv = () => {
    const headers = cfg.cols.map((c) => c.label);
    const escape = (v: any) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((r: any) => cfg.cols.map((c) => escape(r[c.key])).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cfg.table}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-display font-semibold text-lg">{cfg.label}</div>
            <div className="text-xs text-muted-foreground">
              {rows.length} rows {cfg.dateKey ? "· filtered by date range" : ""}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" onClick={addRow} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add row
            </Button>
          </div>
        </div>

        <div className="overflow-auto border border-border/60 rounded-md max-h-[70vh]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
              <tr>
                <th className="w-10 border-b border-border/60 text-[10px] text-muted-foreground font-normal p-1">#</th>
                {cfg.cols.map((c) => (
                  <th
                    key={c.key}
                    className="text-left border-b border-r border-border/60 px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
                    style={{ minWidth: c.width ?? 110 }}
                  >
                    {c.label}
                  </th>
                ))}
                <th className="w-10 border-b border-border/60"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cfg.cols.length + 2} className="text-center py-8 text-xs text-muted-foreground">
                    No entries. Click "Add row" to start.
                  </td>
                </tr>
              )}
              {rows.map((r: any, i: number) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="border-b border-border/40 text-center text-[11px] text-muted-foreground p-0.5">{i + 1}</td>
                  {cfg.cols.map((c) => (
                    <td key={c.key} className="border-b border-r border-border/40 p-0">
                      <Cell
                        value={r[c.key]}
                        type={c.type}
                        onCommit={(v) => updateCell(r.id, c.key, v)}
                      />
                    </td>
                  ))}
                  <td className="border-b border-border/40 text-center">
                    <button
                      onClick={() => deleteRow(r.id)}
                      className="text-muted-foreground/40 hover:text-destructive p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Cell({ value, type, onCommit }: { value: any; type: ColType; onCommit: (v: any) => void }) {
  const [local, setLocal] = useState<any>(value ?? "");
  const initialRef = useRef(value);
  useEffect(() => {
    setLocal(value ?? "");
    initialRef.current = value;
  }, [value]);

  if (type === "bool") {
    return (
      <div className="px-2 py-1.5">
        <input
          type="checkbox"
          checked={!!local}
          onChange={(e) => {
            setLocal(e.target.checked);
            onCommit(e.target.checked);
          }}
          className="accent-primary"
        />
      </div>
    );
  }

  const commit = () => {
    let v: any = local;
    if (type === "number") v = local === "" ? null : Number(local);
    if (String(v ?? "") !== String(initialRef.current ?? "")) onCommit(v);
  };

  return (
    <input
      type={type === "date" ? "date" : type === "number" ? "number" : "text"}
      value={local ?? ""}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={cn(
        "w-full bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/40 rounded-sm",
        type === "number" && "font-mono tabular-nums text-right",
      )}
    />
  );
}

/* ---------- CEO Dashboard ---------- */

function useInsuranceData(range: DateRange) {
  const { start, end } = rangeToIso(range);
  const sales = useQuery({
    queryKey: ["ins", "insurance_sales", { start, end }],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurance_sales").select("*")
        .gte("sale_date", start).lt("sale_date", end);
      if (error) throw error;
      return data ?? [];
    },
  });
  const ringba = useQuery({
    queryKey: ["ins", "insurance_ringba", { start, end }],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurance_ringba").select("*")
        .gte("entry_date", start).lt("entry_date", end);
      if (error) throw error;
      return data ?? [];
    },
  });
  const daily = useQuery({
    queryKey: ["ins", "insurance_agent_daily", { start, end }],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurance_agent_daily").select("*")
        .gte("entry_date", start).lt("entry_date", end);
      if (error) throw error;
      return data ?? [];
    },
  });
  const tiers = useQuery({
    queryKey: ["ins", "insurance_commission_tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurance_commission_tiers").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
  return {
    sales: sales.data ?? [],
    ringba: ringba.data ?? [],
    daily: daily.data ?? [],
    tiers: tiers.data ?? [],
  };
}

function CeoDashboard({ range }: { range: DateRange }) {
  const { sales, ringba, daily } = useInsuranceData(range);

  const totals = useMemo(() => {
    const counted = sales.filter((s: any) => s.count_sale !== false);
    const totalSales = counted.length;
    const policyAmount = counted.reduce((s: number, r: any) => s + Number(r.policy_amount || 0), 0);
    const monthlyPremium = counted.reduce((s: number, r: any) => s + Number(r.monthly_premium || 0), 0);
    const personalLead = counted.reduce((s: number, r: any) => s + Number(r.personal_lead_incentive || 0), 0);
    const ringbaCost = ringba.reduce((s: number, r: any) => s + Number(r.cost_to_ray || 0), 0);
    const paidCalls = ringba.reduce((s: number, r: any) => s + Number(r.paid_calls || 0), 0);
    const incoming = ringba.reduce((s: number, r: any) => s + Number(r.incoming || 0), 0);
    const ringbaSales = ringba.reduce((s: number, r: any) => s + Number(r.ringba_sales || 0), 0);
    const shiftHours = daily.reduce((s: number, r: any) => s + Number(r.shift_hours || 0), 0);
    return {
      totalSales,
      policyAmount,
      monthlyPremium,
      personalLead,
      ringbaCost,
      paidCalls,
      incoming,
      ringbaSales,
      shiftHours,
      costPerSale: ringbaSales ? ringbaCost / ringbaSales : 0,
      salesPerHour: shiftHours ? totalSales / shiftHours : 0,
      net: monthlyPremium * 12 - ringbaCost - personalLead,
    };
  }, [sales, ringba, daily]);

  const byAgent = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of sales) {
      const key = s.agent || "—";
      const cur = map.get(key) || { agent: key, sales: 0, policy: 0, premium: 0, ringbaSales: 0 };
      if (s.count_sale !== false) {
        cur.sales += 1;
        cur.policy += Number(s.policy_amount || 0);
        cur.premium += Number(s.monthly_premium || 0);
        if (s.source && String(s.source).toLowerCase().includes("ringba")) cur.ringbaSales += 1;
      }
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.premium - a.premium);
  }, [sales]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Sales" value={totals.totalSales} />
        <Kpi label="Policy Amount" value={fmtMoney(totals.policyAmount)} />
        <Kpi label="Monthly Premium" value={fmtMoney(totals.monthlyPremium)} tone="primary" />
        <Kpi label="Annualized" value={fmtMoney(totals.monthlyPremium * 12)} tone="primary" />
        <Kpi label="Ringba Cost" value={fmtMoney(totals.ringbaCost)} tone="destructive" />
        <Kpi label="Paid Calls" value={totals.paidCalls} />
        <Kpi label="Cost / Ringba Sale" value={fmtMoney(totals.costPerSale)} />
        <Kpi label="Net Contribution" value={fmtMoney(totals.net)} tone={totals.net >= 0 ? "primary" : "destructive"} />
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="font-display font-semibold text-lg mb-3">Agent Performance</div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="text-left py-2">Agent</th>
                  <th className="text-right">Sales</th>
                  <th className="text-right">Ringba Sales</th>
                  <th className="text-right">Policy Amount</th>
                  <th className="text-right">Monthly Premium</th>
                  <th className="text-right">Annualized</th>
                </tr>
              </thead>
              <tbody>
                {byAgent.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-muted-foreground text-xs">No sales in range.</td></tr>
                )}
                {byAgent.map((a) => (
                  <tr key={a.agent} className="border-b border-border/40">
                    <td className="py-2 font-medium">{a.agent}</td>
                    <td className="text-right font-mono tabular-nums">{a.sales}</td>
                    <td className="text-right font-mono tabular-nums">{a.ringbaSales}</td>
                    <td className="text-right font-mono tabular-nums">{fmtMoney(a.policy)}</td>
                    <td className="text-right font-mono tabular-nums text-primary">{fmtMoney(a.premium)}</td>
                    <td className="text-right font-mono tabular-nums">{fmtMoney(a.premium * 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: any; tone?: "primary" | "destructive" }) {
  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className={cn(
          "font-display font-semibold text-2xl mt-1 tabular-nums",
          tone === "primary" && "text-primary",
          tone === "destructive" && "text-destructive",
        )}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Weekly Payroll (derived from sales + tiers + ringba) ---------- */

function PayrollView({ range }: { range: DateRange }) {
  const { sales, ringba, tiers } = useInsuranceData(range);

  const rows = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of sales) {
      if (s.count_sale === false) continue;
      const ws = s.week_start || s.sale_date || "—";
      const agent = s.agent || "—";
      const key = `${ws}|${agent}`;
      const cur = map.get(key) || {
        week_start: ws, agent, totalSales: 0, personalLead: 0,
        ringbaSales: 0, paidCalls: 0, ringbaCost: 0,
      };
      cur.totalSales += 1;
      cur.personalLead += Number(s.personal_lead_incentive || 0);
      map.set(key, cur);
    }
    for (const r of ringba) {
      const ws = r.week_start || r.entry_date || "—";
      const agent = r.agent || "—";
      const key = `${ws}|${agent}`;
      const cur = map.get(key) || {
        week_start: ws, agent, totalSales: 0, personalLead: 0,
        ringbaSales: 0, paidCalls: 0, ringbaCost: 0,
      };
      cur.ringbaSales += Number(r.ringba_sales || 0);
      cur.paidCalls += Number(r.paid_calls || 0);
      cur.ringbaCost += Number(r.cost_to_ray || 0);
      map.set(key, cur);
    }
    const sortedTiers = [...tiers].sort((a: any, b: any) => (a.min_sales || 0) - (b.min_sales || 0));
    const list = Array.from(map.values()).map((r) => {
      const tier = sortedTiers.find((t: any) => {
        const min = Number(t.min_sales || 0);
        const max = t.max_sales == null ? Infinity : Number(t.max_sales);
        return r.totalSales >= min && r.totalSales <= max;
      });
      const commissionPerSale = Number(tier?.commission_per_sale || 0);
      const salesCommission = commissionPerSale * r.totalSales;
      const totalPay = salesCommission + r.personalLead;
      const costPerSale = r.ringbaSales ? r.ringbaCost / r.ringbaSales : 0;
      return { ...r, tier: tier?.tier_name || "—", commissionPerSale, salesCommission, totalPay, costPerSale };
    });
    return list.sort((a, b) => (b.week_start > a.week_start ? 1 : -1));
  }, [sales, ringba, tiers]);

  const totalPayout = rows.reduce((s, r) => s + r.totalPay, 0);

  const exportCsv = () => {
    downloadCSV(
      `payroll-${Date.now()}.csv`,
      rows.map((r) => ({
        transaction_date: r.week_start,
        type: "expense" as const,
        amount: r.totalPay,
        description: `${r.tier} · ${r.totalSales} sales`,
        vendor: r.agent,
        category_name: "Payroll",
        business_name: "Insurance",
      })),
    );
  };

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display font-semibold text-lg">Weekly Payroll</div>
            <div className="text-xs text-muted-foreground">
              Auto-calculated from Sales Log × Commission Tiers · Total payout {fmtMoney(totalPayout)}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>

        <div className="overflow-auto max-h-[70vh] border border-border/60 rounded-md">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Week</th>
                <th className="text-left">Agent</th>
                <th className="text-right">Sales</th>
                <th className="text-left px-3">Tier</th>
                <th className="text-right">$/Sale</th>
                <th className="text-right">Commission</th>
                <th className="text-right">Personal Lead</th>
                <th className="text-right px-3">Total Pay</th>
                <th className="text-right">Ringba Sales</th>
                <th className="text-right">Paid Calls</th>
                <th className="text-right">Ringba Cost</th>
                <th className="text-right px-3">Cost/Sale</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={12} className="text-center py-6 text-xs text-muted-foreground">Nothing to pay in this range.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border/40">
                  <td className="px-3 py-2">{r.week_start}</td>
                  <td className="font-medium">{r.agent}</td>
                  <td className="text-right font-mono tabular-nums">{r.totalSales}</td>
                  <td className="px-3 text-muted-foreground">{r.tier}</td>
                  <td className="text-right font-mono tabular-nums">{fmtMoney(r.commissionPerSale)}</td>
                  <td className="text-right font-mono tabular-nums">{fmtMoney(r.salesCommission)}</td>
                  <td className="text-right font-mono tabular-nums">{fmtMoney(r.personalLead)}</td>
                  <td className="text-right px-3 font-mono tabular-nums font-semibold text-primary">{fmtMoney(r.totalPay)}</td>
                  <td className="text-right font-mono tabular-nums">{r.ringbaSales}</td>
                  <td className="text-right font-mono tabular-nums">{r.paidCalls}</td>
                  <td className="text-right font-mono tabular-nums text-destructive">{fmtMoney(r.ringbaCost)}</td>
                  <td className="text-right px-3 font-mono tabular-nums">{fmtMoney(r.costPerSale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

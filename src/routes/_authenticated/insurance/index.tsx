import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { fmtMoney, rangeToIso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Shield, ArrowRight } from "lucide-react";
import { num, useIsCEO, useInsuranceFilters } from "@/lib/insurance/shared";

export const Route = createFileRoute("/_authenticated/insurance/")({
  component: OverviewPage,
});

function OverviewPage() {
  const { range, agents } = useInsuranceFilters();
  const { data: isCEO = false } = useIsCEO();
  const { start, end } = rangeToIso(range);
  const client = supabase as any;
  const payrollStart = (() => { const d = new Date(range.from); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
  const applyAgent = (q: any) => (agents.length ? q.in("agent", agents) : q);

  const sales = useQuery({
    queryKey: ["ins", "insurance_sales", { start, end }, agents],
    queryFn: async () => {
      const { data, error } = await applyAgent(client.from("insurance_sales").select("*").gte("sale_date", start).lt("sale_date", end));
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const ringba = useQuery({
    queryKey: ["ins", "insurance_ringba", { start, end }, agents],
    queryFn: async () => {
      const { data, error } = await applyAgent(client.from("insurance_ringba").select("*").gte("entry_date", start).lt("entry_date", end));
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const daily = useQuery({
    queryKey: ["ins", "insurance_agent_daily", { start, end }, agents],
    queryFn: async () => {
      const { data, error } = await applyAgent(client.from("insurance_agent_daily").select("*").gte("entry_date", start).lt("entry_date", end));
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const payroll = useQuery({
    queryKey: ["ins", "insurance_payroll", { start: payrollStart, end }, agents],
    queryFn: async () => {
      const { data, error } = await applyAgent(client.from("insurance_payroll").select("*").gte("week_start", payrollStart).lt("week_start", end));
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const payables = useQuery({
    queryKey: ["ins", "insurance_payables", { start, end }],
    queryFn: async () => {
      const { data, error } = await client.from("insurance_payables").select("*").gte("cost_date", start).lt("cost_date", end);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const qa = useQuery({
    queryKey: ["ins", "insurance_paid_qa", { start, end }, agents],
    queryFn: async () => {
      const { data, error } = await applyAgent(client.from("insurance_paid_qa").select("*").gte("entry_date", start).lt("entry_date", end));
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const salesRows = sales.data ?? [];
  const ringbaRows = ringba.data ?? [];
  const dailyRows = daily.data ?? [];
  const payrollRows = payroll.data ?? [];
  const payablesRows = payables.data ?? [];
  const qaRows = qa.data ?? [];

  const totals = useMemo(() => {
    const counted = salesRows.filter((s) => s.count_sale !== false);
    const totalSales = counted.length;
    const policyAmount = counted.reduce((s, r) => s + num(r.policy_amount), 0);
    const monthlyPremium = counted.reduce((s, r) => s + num(r.monthly_premium), 0);
    const personalLead = counted.reduce((s, r) => s + num(r.personal_lead_incentive), 0);
    const carrierRevRecv = salesRows.reduce((s, r) => s + num(r.carrier_revenue_received_amount), 0);
    const ringbaCost = ringbaRows.reduce((s, r) => s + num(r.cost_to_ray), 0);
    const paidCalls = ringbaRows.reduce((s, r) => s + num(r.paid_calls), 0);
    const incoming = ringbaRows.reduce((s, r) => s + num(r.incoming), 0);
    const connected = ringbaRows.reduce((s, r) => s + num(r.connected), 0);
    const ringbaSales = ringbaRows.reduce((s, r) => s + num(r.ringba_sales), 0);
    const shiftHours = dailyRows.reduce((s, r) => s + num(r.shift_hours), 0);
    const agentPay = payrollRows.reduce((s, r) => s + num(r.total_agent_pay), 0);
    const companyCost = payrollRows.reduce((s, r) => s + num(r.total_company_cost), 0);
    const netCash = payrollRows.reduce((s, r) => s + num(r.net_cash_position), 0);
    const annualized = monthlyPremium * 12;
    const totalCommission = annualized;
    const commissionReceivable = totalCommission * 0.75;

    const qaCount = qaRows.length;
    const qaSold = qaRows.filter((r) => String(r.sale_outcome || "").toLowerCase() === "sale").length;
    const qaCallbacks = qaRows.filter((r) => r.callback_needed).length;
    const qaConverted = salesRows.filter((r) => r.callback_converted).length;

    return {
      totalSales, policyAmount, monthlyPremium, annualized,
      totalCommission, commissionReceivable,
      personalLead, ringbaCost, paidCalls, incoming, connected, ringbaSales,
      shiftHours, agentPay, companyCost, netCash, carrierRevRecv,
      costPerRingbaSale: ringbaSales ? ringbaCost / ringbaSales : 0,
      costPerPaidCall: paidCalls ? ringbaCost / paidCalls : 0,
      connectRate: incoming ? connected / incoming : 0,
      salesPerHour: shiftHours ? totalSales / shiftHours : 0,
      net: annualized - ringbaCost - personalLead - agentPay,
      qaCount, qaSold, qaCallbacks, qaConverted,
      qaSoldPct: qaCount ? qaSold / qaCount : 0,
    };
  }, [salesRows, ringbaRows, dailyRows, payrollRows, qaRows]);

  const byAgent = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of salesRows) {
      const key = s.agent || "—";
      const cur = map.get(key) || { agent: key, sales: 0, policy: 0, premium: 0, ringbaSales: 0, personalLead: 0, pay: 0 };
      if (s.count_sale !== false) {
        cur.sales += 1;
        cur.policy += num(s.policy_amount);
        cur.premium += num(s.monthly_premium);
        cur.personalLead += num(s.personal_lead_incentive);
        if (s.source && String(s.source).toLowerCase().includes("ringba")) cur.ringbaSales += 1;
      }
      map.set(key, cur);
    }
    for (const p of payrollRows) {
      const key = p.agent || "—";
      const cur = map.get(key) || { agent: key, sales: 0, policy: 0, premium: 0, ringbaSales: 0, personalLead: 0, pay: 0 };
      cur.pay = (cur.pay || 0) + num(p.total_agent_pay);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.premium - a.premium);
  }, [salesRows, payrollRows]);

  const payablesSummary = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of payablesRows) {
      const k = r.cost_category || "—";
      const cur = map.get(k) || { cat: k, payable: 0, paid: 0, hold: 0, total: 0 };
      const amt = num(r.amount);
      cur.total += amt;
      const st = String(r.payment_status || "").toLowerCase();
      if (st === "paid") cur.paid += amt;
      else if (/hold|not due/.test(st)) cur.hold += amt;
      else cur.payable += amt;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [payablesRows]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Hero KPIs */}
      <section>
        <SectionTitle>Business Snapshot</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Sales Counted" value={totals.totalSales} />
          <Kpi label="Monthly Premium" value={fmtMoney(totals.monthlyPremium)} tone="primary" />
          <Kpi label="Carrier Revenue Recv." value={fmtMoney(totals.carrierRevRecv)} />
          <Kpi label="Net Cash Position" value={fmtMoney(totals.netCash)} tone={totals.netCash >= 0 ? "primary" : "destructive"} />
        </div>
      </section>

      {/* CEO strip */}
      {isCEO && (
        <section>
          <SectionTitle>
            <Shield className="h-3 w-3" /> CEO · Commission View
          </SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Annualized Premium" value={fmtMoney(totals.annualized)} tone="primary" />
            <Kpi label="Total Commission (×12)" value={fmtMoney(totals.totalCommission)} tone="primary" />
            <Kpi label="Receivable (75%)" value={fmtMoney(totals.commissionReceivable)} tone="primary" />
            <Kpi label="Est. Net Contribution" value={fmtMoney(totals.net)} tone={totals.net >= 0 ? "primary" : "destructive"} />
          </div>
        </section>
      )}

      {/* Operations */}
      <section>
        <SectionTitle>Operations Pulse</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Incoming Calls" value={totals.incoming.toLocaleString()} />
          <Kpi label="Connect Rate" value={`${(totals.connectRate * 100).toFixed(1)}%`} />
          <Kpi label="Ringba Cost" value={fmtMoney(totals.ringbaCost)} tone="destructive" />
          <Kpi label="Cost / Ringba Sale" value={fmtMoney(totals.costPerRingbaSale)} />
          <Kpi label="Agent Pay" value={fmtMoney(totals.agentPay)} tone="destructive" />
          <Kpi label="Company Cost" value={fmtMoney(totals.companyCost)} tone="destructive" />
          <Kpi label="Sales / Hour" value={totals.salesPerHour.toFixed(2)} />
          <Kpi label="Paid Calls" value={totals.paidCalls.toLocaleString()} />
        </div>
      </section>

      {/* QA */}
      <section>
        <SectionTitle>QA Health</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Calls Reviewed" value={totals.qaCount} />
          <Kpi label="QA Sold %" value={`${(totals.qaSoldPct * 100).toFixed(1)}%`} tone="primary" />
          <Kpi label="Callbacks Needed" value={totals.qaCallbacks} />
          <Kpi label="Callbacks Converted" value={totals.qaConverted} tone="primary" />
        </div>
      </section>

      {/* Agent leaderboard */}
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-semibold text-lg">Top Agents</div>
            <Link to="/insurance/sales" className="text-xs text-primary hover:underline flex items-center gap-1">
              View sales ledger <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
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
                  <th className="text-right">Personal Lead</th>
                  <th className="text-right">Total Pay</th>
                </tr>
              </thead>
              <tbody>
                {byAgent.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-6 text-muted-foreground text-xs">No sales in range.</td></tr>
                )}
                {byAgent.slice(0, 12).map((a) => (
                  <tr key={a.agent} className="border-b border-border/40">
                    <td className="py-2 font-medium">{a.agent}</td>
                    <td className="text-right font-mono tabular-nums">{a.sales}</td>
                    <td className="text-right font-mono tabular-nums">{a.ringbaSales}</td>
                    <td className="text-right font-mono tabular-nums">{fmtMoney(a.policy)}</td>
                    <td className="text-right font-mono tabular-nums text-primary">{fmtMoney(a.premium)}</td>
                    <td className="text-right font-mono tabular-nums">{fmtMoney(a.premium * 12)}</td>
                    <td className="text-right font-mono tabular-nums">{fmtMoney(a.personalLead)}</td>
                    <td className="text-right font-mono tabular-nums">{fmtMoney(a.pay || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payables snapshot */}
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-semibold text-lg">Company Payables Snapshot</div>
            <Link to="/insurance/payables" className="text-xs text-primary hover:underline flex items-center gap-1">
              Manage payables <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {payablesSummary.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">
              No payables recorded in this range. Add rows in Company Payables.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="text-left py-2">Category</th>
                    <th className="text-right">Payable</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Hold / Not Due</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payablesSummary.map((row) => (
                    <tr key={row.cat} className="border-b border-border/40">
                      <td className="py-2 font-medium">{row.cat}</td>
                      <td className="text-right font-mono tabular-nums text-destructive">{fmtMoney(row.payable)}</td>
                      <td className="text-right font-mono tabular-nums text-primary">{fmtMoney(row.paid)}</td>
                      <td className="text-right font-mono tabular-nums text-muted-foreground">{fmtMoney(row.hold)}</td>
                      <td className="text-right font-mono tabular-nums">{fmtMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
      {children}
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

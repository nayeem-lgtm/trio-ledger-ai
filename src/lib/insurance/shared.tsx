import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type DateRange } from "@/lib/format";

/* ---------- Types & sheet config ---------- */

export type ColType = "text" | "number" | "date" | "bool";
export type Col = {
  key: string;
  label: string;
  type: ColType;
  width?: number;
  custom?: boolean;
  computed?: (row: any) => number;
  ceoOnly?: boolean;
};

export type SheetCfg = {
  label: string;
  table: string;
  cols: Col[];
  dateKey: string | null;
  description: string;
  report?: (rows: any[], isCEO: boolean) => { label: string; value: string; tone?: "primary" | "destructive" | "muted" }[];
};

export function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
export function isoOf(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function weekStartOf(dateIso: string | Date | null | undefined): string | null {
  if (!dateIso) return null;
  const d = typeof dateIso === "string" ? new Date(dateIso + "T00:00:00") : new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return isoOf(d);
}

export const SHEETS: Record<"sales" | "daily_ops" | "paid_qa" | "payroll" | "payables" | "agents" | "tiers", SheetCfg> = {
  sales: {
    label: "Sales & Policies",
    table: "insurance_sales",
    description: "Every issued policy — customer, carrier, payment terms, QA status and commission eligibility.",
    cols: [
      { key: "sale_date", label: "Sale Date", type: "date", width: 120 },
      { key: "week_start", label: "Week Start", type: "date", width: 120 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "customer_name", label: "Customer", type: "text", width: 150 },
      { key: "phone_number", label: "Phone", type: "text", width: 130 },
      { key: "state", label: "State", type: "text", width: 70 },
      { key: "product", label: "Product", type: "text" },
      { key: "carrier", label: "Carrier", type: "text" },
      { key: "policy_number", label: "Policy #", type: "text", width: 120 },
      { key: "policy_start_date", label: "Policy Start", type: "date", width: 120 },
      { key: "payment_method", label: "Payment Method", type: "text", width: 160 },
      { key: "payment_risk", label: "Payment Risk", type: "text", width: 130 },
      { key: "premium_draft_date", label: "Draft Date", type: "date", width: 120 },
      { key: "payment_status", label: "Payment Status", type: "text", width: 150 },
      { key: "policy_amount", label: "Policy Amount", type: "number" },
      { key: "monthly_premium", label: "Monthly Premium", type: "number" },
      { key: "carrier_revenue_received_amount", label: "Carrier Rev. Recv.", type: "number", width: 150 },
      { key: "carrier_revenue_received", label: "Rev. Recv.?", type: "bool" },
      { key: "revenue_received_date", label: "Rev. Recv. Date", type: "date", width: 130 },
      { key: "__total_commission", label: "Total Commission", type: "number", width: 140, ceoOnly: true, computed: (r: any) => num(r.monthly_premium) * 12 },
      { key: "__commission_receivable", label: "Commission Receivable (75%)", type: "number", width: 180, ceoOnly: true, computed: (r: any) => num(r.monthly_premium) * 12 * 0.75 },
      { key: "sale_status", label: "Sale Status", type: "text" },
      { key: "count_sale", label: "Count?", type: "bool" },
      { key: "commission_eligible", label: "Comm. Eligible?", type: "bool" },
      { key: "personal_lead_incentive", label: "Personal Lead $", type: "number" },
      { key: "ringba_target", label: "Ringba Target", type: "text", width: 160 },
      { key: "publisher", label: "Publisher", type: "text" },
      { key: "qa_status", label: "QA Status", type: "text" },
      { key: "callback_converted", label: "Callback Conv.?", type: "bool" },
      { key: "notes", label: "Notes", type: "text", width: 220 },
    ],
    dateKey: "sale_date",
    report: (rows: any[], isCEO: boolean) => {
      const counted = rows.filter((r) => r.count_sale !== false);
      const premium = counted.reduce((s, r) => s + num(r.monthly_premium), 0);
      const policy = counted.reduce((s, r) => s + num(r.policy_amount), 0);
      const revRecv = rows.reduce((s, r) => s + num(r.carrier_revenue_received_amount), 0);
      const out: any[] = [
        { label: "Sales counted", value: counted.length.toString() },
        { label: "Policy Amount", value: fmtM(policy) },
        { label: "Monthly Premium", value: fmtM(premium), tone: "primary" },
        { label: "Carrier Revenue Received", value: fmtM(revRecv) },
      ];
      if (isCEO) {
        out.push({ label: "Total Commission", value: fmtM(premium * 12), tone: "primary" });
        out.push({ label: "Receivable (75%)", value: fmtM(premium * 12 * 0.75), tone: "primary" });
      }
      return out;
    },
  },
  daily_ops: {
    label: "Daily Ops",
    table: "insurance_ringba",
    description: "Merged Ringba + CallTools daily activity per agent.",
    cols: [
      { key: "entry_date", label: "Date", type: "date", width: 120 },
      { key: "week_start", label: "Week Start", type: "date", width: 120 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "paid_hours", label: "Paid Hours", type: "number" },
      { key: "incoming", label: "Incoming", type: "number" },
      { key: "completed", label: "Completed", type: "number" },
      { key: "ended", label: "Ended", type: "number" },
      { key: "connected", label: "Connected", type: "number" },
      { key: "paid_calls", label: "Paid Calls", type: "number" },
      { key: "cost_to_ray", label: "Ringba Cost", type: "number" },
      { key: "paid_out_pct", label: "Paid Out %", type: "number" },
      { key: "acl", label: "ACL", type: "text" },
      { key: "ringba_sales", label: "Ringba Sales", type: "number" },
      { key: "cost_per_sale", label: "Cost / Sale", type: "number" },
      { key: "ct_total_dispositions", label: "CT Disp.", type: "number" },
      { key: "ct_customer_hang_up", label: "CT Hang Up", type: "number" },
      { key: "ct_call_back_scheduled", label: "CT Callback Sched.", type: "number" },
      { key: "ct_busy_call_back_later", label: "CT Busy/Later", type: "number" },
      { key: "ct_sale_made", label: "CT Sale Made", type: "number" },
      { key: "ct_not_interested", label: "CT Not Int.", type: "number" },
      { key: "ct_no_contact", label: "CT No Contact", type: "number" },
      { key: "ct_dnc", label: "CT DNC", type: "number" },
      { key: "ct_total_calls", label: "CT Total Calls", type: "number" },
      { key: "ct_inbound_calls", label: "CT Inbound", type: "number" },
      { key: "ct_outbound_calls", label: "CT Outbound", type: "number" },
      { key: "ct_phone_hours", label: "CT Phone Hrs", type: "number" },
      { key: "ringba_cost_status", label: "Ringba Cost Status", type: "text", width: 140 },
      { key: "calltools_source", label: "CT Source", type: "text" },
      { key: "manager_notes", label: "Manager Notes", type: "text", width: 220 },
    ],
    dateKey: "entry_date",
    report: (rows: any[]) => {
      const incoming = rows.reduce((s, r) => s + num(r.incoming), 0);
      const connected = rows.reduce((s, r) => s + num(r.connected), 0);
      const paid = rows.reduce((s, r) => s + num(r.paid_calls), 0);
      const cost = rows.reduce((s, r) => s + num(r.cost_to_ray), 0);
      const rSales = rows.reduce((s, r) => s + num(r.ringba_sales), 0);
      const ctSales = rows.reduce((s, r) => s + num(r.ct_sale_made), 0);
      return [
        { label: "Incoming", value: incoming.toLocaleString() },
        { label: "Connect Rate", value: incoming ? `${((connected / incoming) * 100).toFixed(1)}%` : "—" },
        { label: "Paid Calls", value: paid.toLocaleString() },
        { label: "Ringba Cost", value: fmtM(cost), tone: "destructive" },
        { label: "Ringba Sales", value: rSales.toString() },
        { label: "Cost / Ringba Sale", value: rSales ? fmtM(cost / rSales) : "—" },
        { label: "CT Sales Made", value: ctSales.toString(), tone: "primary" },
      ];
    },
  },
  paid_qa: {
    label: "Paid Call QA",
    table: "insurance_paid_qa",
    description: "Per-call QA review of paid Ringba traffic — outcome, loss reason, and follow-up.",
    cols: [
      { key: "entry_date", label: "Date", type: "date", width: 120 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "ringba_target", label: "Ringba Target", type: "text", width: 160 },
      { key: "caller_id", label: "Caller ID", type: "text", width: 130 },
      { key: "paid_call_cost", label: "Paid Call Cost", type: "number" },
      { key: "duration", label: "Duration", type: "text" },
      { key: "qa_status", label: "QA Status", type: "text" },
      { key: "sale_outcome", label: "Sale Outcome", type: "text" },
      { key: "loss_reason", label: "Loss Reason", type: "text", width: 160 },
      { key: "callback_needed", label: "Callback?", type: "bool" },
      { key: "follow_up_owner", label: "Follow-up Owner", type: "text" },
      { key: "payment_method_seen", label: "Payment Method Seen", type: "text", width: 170 },
      { key: "customer_name", label: "Customer", type: "text", width: 150 },
      { key: "state", label: "State", type: "text", width: 70 },
      { key: "policy_number", label: "Policy #", type: "text", width: 120 },
      { key: "policy_start_date", label: "Policy Start", type: "date", width: 120 },
      { key: "notes", label: "Notes", type: "text", width: 220 },
    ],
    dateKey: "entry_date",
    report: (rows: any[]) => {
      const cost = rows.reduce((s, r) => s + num(r.paid_call_cost), 0);
      const sold = rows.filter((r) => String(r.sale_outcome || "").toLowerCase() === "sale").length;
      const cb = rows.filter((r) => r.callback_needed).length;
      return [
        { label: "Calls Reviewed", value: rows.length.toString() },
        { label: "Sales", value: sold.toString(), tone: "primary" },
        { label: "Sold %", value: rows.length ? `${((sold / rows.length) * 100).toFixed(1)}%` : "—" },
        { label: "Total Paid Cost", value: fmtM(cost), tone: "destructive" },
        { label: "Callbacks Needed", value: cb.toString() },
      ];
    },
  },
  payroll: {
    label: "Payroll & Costs",
    table: "insurance_payroll",
    description: "Weekly base pay, commission, CallTools + Ringba costs, carrier revenue, net cash position.",
    cols: [
      { key: "week_start", label: "Week Start", type: "date", width: 120 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "hourly_rate", label: "Hourly Rate", type: "number" },
      { key: "paid_hours", label: "Paid Hours", type: "number" },
      { key: "base_payroll_due", label: "Base Payroll Due", type: "number" },
      { key: "base_pay_status", label: "Base Pay Status", type: "text", width: 140 },
      { key: "base_paid_date", label: "Base Paid Date", type: "date", width: 130 },
      { key: "total_sales", label: "Valid Sales", type: "number" },
      { key: "commission_per_sale", label: "$/Sale", type: "number" },
      { key: "sales_commission", label: "Sales Commission", type: "number" },
      { key: "personal_lead_incentive", label: "Personal Lead", type: "number" },
      { key: "end_month_agent_payable", label: "End-Month Payable", type: "number", width: 150 },
      { key: "calltools_weekly_cost", label: "CallTools Weekly", type: "number", width: 140 },
      { key: "ringba_cost", label: "Ringba Cost", type: "number" },
      { key: "other_cost", label: "Other Cost", type: "number" },
      { key: "total_company_cost", label: "Total Company Cost", type: "number", width: 160 },
      { key: "carrier_revenue_received", label: "Carrier Rev. Recv.", type: "number", width: 150 },
      { key: "premium_written", label: "Premium Written", type: "number" },
      { key: "net_cash_position", label: "Net Cash Position", type: "number", width: 150 },
      { key: "total_agent_pay", label: "Total Pay", type: "number" },
      { key: "ringba_sales", label: "Ringba Sales", type: "number" },
      { key: "paid_calls", label: "Paid Calls", type: "number" },
      { key: "notes", label: "Notes", type: "text", width: 220 },
    ],
    dateKey: "week_start",
    report: (rows: any[]) => {
      const base = rows.reduce((s, r) => s + num(r.base_payroll_due), 0);
      const comm = rows.reduce((s, r) => s + num(r.sales_commission), 0);
      const cost = rows.reduce((s, r) => s + num(r.total_company_cost), 0);
      const prem = rows.reduce((s, r) => s + num(r.premium_written), 0);
      const net = rows.reduce((s, r) => s + num(r.net_cash_position), 0);
      return [
        { label: "Base Payroll", value: fmtM(base) },
        { label: "Commission", value: fmtM(comm) },
        { label: "Total Company Cost", value: fmtM(cost), tone: "destructive" },
        { label: "Premium Written", value: fmtM(prem), tone: "primary" },
        { label: "Net Cash Position", value: fmtM(net), tone: net >= 0 ? "primary" : "destructive" },
      ];
    },
  },
  payables: {
    label: "Company Payables",
    table: "insurance_payables",
    description: "Ringba, CallTools, Gusto and commission payables — track due dates and payment status.",
    cols: [
      { key: "cost_date", label: "Cost Date", type: "date", width: 120 },
      { key: "week_start", label: "Week Start", type: "date", width: 120 },
      { key: "month", label: "Month", type: "text", width: 90 },
      { key: "cost_category", label: "Category", type: "text", width: 160 },
      { key: "vendor_agent", label: "Vendor / Agent", type: "text", width: 180 },
      { key: "amount", label: "Amount", type: "number" },
      { key: "due_date", label: "Due Date", type: "date", width: 120 },
      { key: "payment_status", label: "Status", type: "text", width: 120 },
      { key: "paid_date", label: "Paid Date", type: "date", width: 120 },
      { key: "related_week", label: "Related Week", type: "date", width: 120 },
      { key: "notes", label: "Notes", type: "text", width: 260 },
    ],
    dateKey: "cost_date",
    report: (rows: any[]) => {
      const total = rows.reduce((s, r) => s + num(r.amount), 0);
      const paid = rows.filter((r) => String(r.payment_status || "").toLowerCase() === "paid").reduce((s, r) => s + num(r.amount), 0);
      const payable = rows.filter((r) => String(r.payment_status || "").toLowerCase() === "payable").reduce((s, r) => s + num(r.amount), 0);
      const hold = rows.filter((r) => /hold|not due/i.test(String(r.payment_status || ""))).reduce((s, r) => s + num(r.amount), 0);
      return [
        { label: "Total", value: fmtM(total) },
        { label: "Payable", value: fmtM(payable), tone: "destructive" },
        { label: "Paid", value: fmtM(paid), tone: "primary" },
        { label: "Hold / Not Due", value: fmtM(hold), tone: "muted" },
      ];
    },
  },
  agents: {
    label: "Agent Master",
    table: "insurance_agents",
    description: "Agent roster — status, pay rate, CallTools seat cost, licensed states and product focus.",
    cols: [
      { key: "name", label: "Agent Name", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "hourly_rate", label: "Hourly Rate", type: "number" },
      { key: "calltools_seat_cost", label: "CT Seat / mo", type: "number", width: 130 },
      { key: "licensed_states", label: "Licensed States", type: "text", width: 220 },
      { key: "primary_carrier", label: "Primary Carrier", type: "text" },
      { key: "product_focus", label: "Product Focus", type: "text" },
      { key: "notes", label: "Notes", type: "text", width: 280 },
    ],
    dateKey: null,
    report: (rows: any[]) => {
      const active = rows.filter((r) => String(r.status || "").toLowerCase() === "active").length;
      const seat = rows.reduce((s, r) => s + num(r.calltools_seat_cost), 0);
      return [
        { label: "Agents", value: rows.length.toString() },
        { label: "Active", value: active.toString(), tone: "primary" },
        { label: "Monthly Seat Cost", value: fmtM(seat), tone: "destructive" },
      ];
    },
  },
  tiers: {
    label: "Commission Tiers",
    table: "insurance_commission_tiers",
    description: "Sales-count brackets and matching commission-per-sale rates used by payroll generation.",
    cols: [
      { key: "tier_name", label: "Tier", type: "text" },
      { key: "min_sales", label: "Min Sales", type: "number" },
      { key: "max_sales", label: "Max Sales", type: "number" },
      { key: "commission_per_sale", label: "$/Sale", type: "number" },
      { key: "notes", label: "Notes", type: "text", width: 280 },
    ],
    dateKey: null,
    report: (rows: any[]) => [{ label: "Tiers configured", value: rows.length.toString() }],
  },
} as unknown as Record<string, SheetCfg>;

export type SheetKey = "sales" | "daily_ops" | "paid_qa" | "payroll" | "payables" | "agents" | "tiers";

// Local money formatter to avoid a circular import at load time.
function fmtM(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
}

/* ---------- CEO check ---------- */

export function useIsCEO() {
  return useQuery({
    queryKey: ["is-ceo"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await (supabase as any)
        .from("team_members")
        .select("role")
        .eq("member_user_id", u.user.id);
      const memberships = (data ?? []) as any[];
      if (memberships.length === 0) return true;
      return memberships.some((m) => m.role === "admin");
    },
    staleTime: 60_000,
  });
}

/* ---------- Filters context ---------- */

type FiltersCtx = {
  range: DateRange;
  setRange: (r: DateRange) => void;
  agents: string[];
  setAgents: (a: string[]) => void;
  stepRange: (dir: -1 | 1) => void;
};

const Ctx = createContext<FiltersCtx | null>(null);

export function InsuranceFiltersProvider({ value, children }: { value: FiltersCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInsuranceFilters() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useInsuranceFilters must be inside InsuranceFiltersProvider");
  return v;
}

export function derivePayroll(row: any) {
  const commission = num(row.total_sales) * num(row.commission_per_sale);
  const pay = commission + num(row.personal_lead_incentive);
  return { sales_commission: commission, total_agent_pay: pay };
}

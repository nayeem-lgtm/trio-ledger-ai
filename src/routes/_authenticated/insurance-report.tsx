import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Download, Shield, Columns3, RefreshCw, ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { fmtMoney, buildPreset, rangeToIso, fmtRange, type DateRange } from "@/lib/format";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/insurance-report")({
  component: InsuranceReport,
});

type ColType = "text" | "number" | "date" | "bool";
type Col = { key: string; label: string; type: ColType; width?: number; custom?: boolean };

type SheetCfg = {
  label: string;
  table: string;
  cols: Col[];
  dateKey: string | null;
};

const SHEETS: Record<string, SheetCfg> = {
  sales: {
    label: "Sales Log",
    table: "insurance_sales",
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
    ],
    dateKey: "sale_date",
  },
  calltools: {
    label: "CallTools",
    table: "insurance_calltools",
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
    ],
    dateKey: "entry_date",
  },
  ringba: {
    label: "Ringba",
    table: "insurance_ringba",
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
    ],
    dateKey: "entry_date",
  },
  paid_qa: {
    label: "Paid Call QA",
    table: "insurance_paid_qa",
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
    ],
    dateKey: "entry_date",
  },
  agent_daily: {
    label: "Agent Daily",
    table: "insurance_agent_daily",
    cols: [
      { key: "entry_date", label: "Date", type: "date", width: 130 },
      { key: "week_start", label: "Week Start", type: "date", width: 130 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "shift_hours", label: "Shift Hours", type: "number" },
      { key: "manager_score", label: "Mgr Score", type: "number" },
      { key: "manager_notes", label: "Notes", type: "text", width: 260 },
    ],
    dateKey: "entry_date",
  },
  payroll: {
    label: "Weekly Payroll",
    table: "insurance_payroll",
    cols: [
      { key: "week_start", label: "Week Start", type: "date", width: 130 },
      { key: "agent", label: "Agent", type: "text" },
      { key: "total_sales", label: "Total Sales", type: "number" },
      { key: "commission_per_sale", label: "$/Sale", type: "number" },
      { key: "sales_commission", label: "Sales Commission", type: "number" },
      { key: "personal_lead_incentive", label: "Personal Lead", type: "number" },
      { key: "total_agent_pay", label: "Total Pay", type: "number" },
      { key: "ringba_sales", label: "Ringba Sales", type: "number" },
      { key: "paid_calls", label: "Paid Calls", type: "number" },
      { key: "ringba_cost", label: "Ringba Cost", type: "number" },
      { key: "notes", label: "Notes", type: "text", width: 220 },
    ],
    dateKey: "week_start",
  },
  agents: {
    label: "Agents",
    table: "insurance_agents",
    cols: [
      { key: "name", label: "Agent Name", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "notes", label: "Notes", type: "text", width: 280 },
    ],
    dateKey: null,
  },
  tiers: {
    label: "Commission Tiers",
    table: "insurance_commission_tiers",
    cols: [
      { key: "tier_name", label: "Tier", type: "text" },
      { key: "min_sales", label: "Min Sales", type: "number" },
      { key: "max_sales", label: "Max Sales", type: "number" },
      { key: "commission_per_sale", label: "$/Sale", type: "number" },
      { key: "notes", label: "Notes", type: "text", width: 280 },
    ],
    dateKey: null,
  },
};

type SheetKey = keyof typeof SHEETS;

/* ------------------------------------------------------------ */
/* Utilities                                                     */
/* ------------------------------------------------------------ */

function isoOf(d: Date) {
  return d.toISOString().slice(0, 10);
}
function weekStartOf(dateIso: string | Date | null | undefined): string | null {
  if (!dateIso) return null;
  const d = typeof dateIso === "string" ? new Date(dateIso + "T00:00:00") : new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return isoOf(d);
}
function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------ */
/* Component                                                     */
/* ------------------------------------------------------------ */

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
            Editable spreadsheets with add/edit/delete rows &amp; custom columns. Payroll can be auto-generated from Sales &amp; Ringba, then hand-edited.
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="summary">CEO Dashboard</TabsTrigger>
          {(Object.keys(SHEETS) as SheetKey[]).map((k) => (
            <TabsTrigger key={k} value={k}>{SHEETS[k].label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <CeoDashboard range={range} />
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

/* ------------------------------------------------------------ */
/* Editable grid with custom columns                              */
/* ------------------------------------------------------------ */

function SheetGrid({ sheetKey, range }: { sheetKey: SheetKey; range: DateRange }) {
  const cfg = SHEETS[sheetKey];
  const qc = useQueryClient();
  const client = supabase as any;
  const { start, end } = rangeToIso(range);
  const [addColOpen, setAddColOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);

  // Custom columns
  const { data: customCols = [] } = useQuery({
    queryKey: ["ins-cols", sheetKey],
    queryFn: async () => {
      const { data, error } = await client
        .from("insurance_custom_columns")
        .select("*")
        .eq("sheet_key", sheetKey)
        .order("position");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const allCols: Col[] = useMemo(
    () => [
      ...cfg.cols,
      ...customCols.map((c: any) => ({
        key: c.col_key,
        label: c.label,
        type: c.col_type as ColType,
        custom: true,
      })),
    ],
    [cfg.cols, customCols],
  );

  // Data rows
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
    const today = isoOf(new Date());
    const seed: Record<string, any> = { owner_id: u.user.id };
    if (cfg.dateKey) seed[cfg.dateKey] = today;
    if (cfg.cols.some((c) => c.key === "week_start")) seed.week_start = weekStartOf(today);
    const { error } = await client.from(cfg.table).insert(seed);
    if (error) toast.error(error.message);
    else invalidate();
  };

  const updateCell = async (id: string, col: Col, value: any) => {
    const patch: Record<string, any> = col.custom
      ? { extra: { ...(rows.find((r: any) => r.id === id)?.extra || {}), [col.key]: value } }
      : { [col.key]: value };
    // Auto-recompute helpers
    if (!col.custom && cfg.table === "insurance_payroll") {
      const current = { ...(rows.find((r: any) => r.id === id) || {}), ...patch };
      const computed = derivePayroll(current);
      patch.sales_commission = computed.sales_commission;
      patch.total_agent_pay = computed.total_agent_pay;
    }
    const { error } = await client.from(cfg.table).update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  const deleteRow = async (id: string) => {
    const { error } = await client.from(cfg.table).delete().eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  const removeCustomCol = async (id: string, key: string) => {
    if (!confirm(`Remove column "${key}"? Data stored under it will be dropped.`)) return;
    await client.from("insurance_custom_columns").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ins-cols", sheetKey] });
  };

  const exportCsv = () => {
    const headers = allCols.map((c) => c.label);
    const val = (r: any, c: Col) => (c.custom ? r.extra?.[c.key] : r[c.key]);
    const escape = (v: any) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((r: any) => allCols.map((c) => escape(val(r, c))).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cfg.table}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Column totals for numeric cols
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of allCols) {
      if (c.type === "number") {
        t[c.key] = rows.reduce((s: number, r: any) => s + num(c.custom ? r.extra?.[c.key] : r[c.key]), 0);
      }
    }
    return t;
  }, [allCols, rows]);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="font-display font-semibold text-lg">{cfg.label}</div>
            <div className="text-xs text-muted-foreground">
              {rows.length} rows {cfg.dateKey ? "· filtered by date range" : "· all-time"}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {sheetKey === "payroll" && (
              <Button variant="outline" size="sm" onClick={() => setGenOpen(true)} className="gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> Generate from Sales
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setAddColOpen(true)} className="gap-1">
              <Columns3 className="h-3.5 w-3.5" /> Add column
            </Button>
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
                {allCols.map((c) => (
                  <th
                    key={c.key}
                    className="text-left border-b border-r border-border/60 px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium group"
                    style={{ minWidth: c.width ?? 110 }}
                  >
                    <div className="flex items-center gap-1">
                      <span>{c.label}</span>
                      {c.custom && (
                        <button
                          onClick={() => {
                            const meta = customCols.find((cc: any) => cc.col_key === c.key);
                            if (meta) removeCustomCol(meta.id, c.key);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive ml-1"
                          title="Remove column"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-10 border-b border-border/60"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={allCols.length + 2} className="text-center py-8 text-xs text-muted-foreground">
                    No entries. Click "Add row" to start.
                  </td>
                </tr>
              )}
              {rows.map((r: any, i: number) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="border-b border-border/40 text-center text-[11px] text-muted-foreground p-0.5">{i + 1}</td>
                  {allCols.map((c) => {
                    const v = c.custom ? r.extra?.[c.key] : r[c.key];
                    return (
                      <td key={c.key} className="border-b border-r border-border/40 p-0">
                        <Cell
                          value={v}
                          type={c.type}
                          onCommit={(val) => updateCell(r.id, c, val)}
                        />
                      </td>
                    );
                  })}
                  <td className="border-b border-border/40 text-center">
                    <button
                      onClick={() => deleteRow(r.id)}
                      className="text-muted-foreground/40 hover:text-destructive p-1"
                      title="Delete row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr className="bg-muted/50 font-medium sticky bottom-0">
                  <td className="border-t-2 border-border p-1 text-[10px] uppercase text-muted-foreground text-center">Σ</td>
                  {allCols.map((c) => (
                    <td key={c.key} className="border-t-2 border-r border-border px-2 py-1.5 text-sm">
                      {c.type === "number" ? (
                        <span className="font-mono tabular-nums block text-right">
                          {c.label.toLowerCase().includes("cost") || c.key.includes("amount") || c.key.includes("premium") || c.key.includes("pay") || c.key.includes("commission") || c.key.includes("incentive")
                            ? fmtMoney(totals[c.key] || 0)
                            : (totals[c.key] || 0).toLocaleString()}
                        </span>
                      ) : null}
                    </td>
                  ))}
                  <td className="border-t-2 border-border"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <AddColumnDialog
        open={addColOpen}
        onOpenChange={setAddColOpen}
        sheetKey={sheetKey}
        existingKeys={allCols.map((c) => c.key)}
        nextPosition={customCols.length}
        onAdded={() => qc.invalidateQueries({ queryKey: ["ins-cols", sheetKey] })}
      />
      {sheetKey === "payroll" && (
        <GeneratePayrollDialog
          open={genOpen}
          onOpenChange={setGenOpen}
          range={range}
          onDone={invalidate}
        />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ */
/* Cell input                                                    */
/* ------------------------------------------------------------ */

function Cell({ value, type, onCommit }: { value: any; type: ColType; onCommit: (v: any) => void }) {
  const [local, setLocal] = useState<any>(value ?? "");
  const initialRef = useRef(value);
  useEffect(() => {
    setLocal(value ?? "");
    initialRef.current = value;
  }, [value]);

  if (type === "bool") {
    return (
      <div className="px-2 py-1.5 flex justify-center">
        <input
          type="checkbox"
          checked={!!local}
          onChange={(e) => {
            setLocal(e.target.checked);
            onCommit(e.target.checked);
          }}
          className="accent-primary h-4 w-4"
        />
      </div>
    );
  }

  const commit = () => {
    let v: any = local;
    if (type === "number") v = local === "" || local == null ? null : Number(local);
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
      step={type === "number" ? "any" : undefined}
    />
  );
}

/* ------------------------------------------------------------ */
/* Add-column dialog                                              */
/* ------------------------------------------------------------ */

function AddColumnDialog({
  open,
  onOpenChange,
  sheetKey,
  existingKeys,
  nextPosition,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  sheetKey: string;
  existingKeys: string[];
  nextPosition: number;
  onAdded: () => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ColType>("text");

  const submit = async () => {
    const trimmed = label.trim();
    if (!trimmed) return toast.error("Give the column a name.");
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!key) return toast.error("Invalid column name.");
    if (existingKeys.includes(key)) return toast.error("Column already exists.");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await (supabase as any).from("insurance_custom_columns").insert({
      owner_id: u.user.id,
      sheet_key: sheetKey,
      col_key: key,
      label: trimmed,
      col_type: type,
      position: nextPosition,
    });
    if (error) return toast.error(error.message);
    toast.success("Column added");
    setLabel("");
    setType("text");
    onAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add custom column</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Column name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Follow-up notes" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ColType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="bool">Yes / No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add column</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ */
/* Payroll derivation                                             */
/* ------------------------------------------------------------ */

function derivePayroll(row: any) {
  const commission = num(row.total_sales) * num(row.commission_per_sale);
  const pay = commission + num(row.personal_lead_incentive);
  return { sales_commission: commission, total_agent_pay: pay };
}

function GeneratePayrollDialog({
  open,
  onOpenChange,
  range,
  onDone,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  range: DateRange;
  onDone: () => void;
}) {
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const client = supabase as any;
  const { start, end } = rangeToIso(range);

  const run = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [salesRes, ringbaRes, tiersRes] = await Promise.all([
        client.from("insurance_sales").select("*").gte("sale_date", start).lt("sale_date", end),
        client.from("insurance_ringba").select("*").gte("entry_date", start).lt("entry_date", end),
        client.from("insurance_commission_tiers").select("*"),
      ]);
      const sales: any[] = salesRes.data ?? [];
      const ringba: any[] = ringbaRes.data ?? [];
      const tiers: any[] = tiersRes.data ?? [];

      const map = new Map<string, any>();
      for (const s of sales) {
        if (s.count_sale === false) continue;
        const ws = s.week_start || weekStartOf(s.sale_date) || start;
        const agent = s.agent || "—";
        const key = `${ws}|${agent}`;
        const cur = map.get(key) || {
          week_start: ws, agent, total_sales: 0, personal_lead_incentive: 0,
          ringba_sales: 0, paid_calls: 0, ringba_cost: 0,
        };
        cur.total_sales += 1;
        cur.personal_lead_incentive += num(s.personal_lead_incentive);
        map.set(key, cur);
      }
      for (const r of ringba) {
        const ws = r.week_start || weekStartOf(r.entry_date) || start;
        const agent = r.agent || "—";
        const key = `${ws}|${agent}`;
        const cur = map.get(key) || {
          week_start: ws, agent, total_sales: 0, personal_lead_incentive: 0,
          ringba_sales: 0, paid_calls: 0, ringba_cost: 0,
        };
        cur.ringba_sales += num(r.ringba_sales);
        cur.paid_calls += num(r.paid_calls);
        cur.ringba_cost += num(r.cost_to_ray);
        map.set(key, cur);
      }
      const sortedTiers = [...tiers].sort((a, b) => num(a.min_sales) - num(b.min_sales));
      const inserts = Array.from(map.values()).map((r) => {
        const tier = sortedTiers.find((t) => {
          const min = num(t.min_sales);
          const max = t.max_sales == null ? Infinity : num(t.max_sales);
          return r.total_sales >= min && r.total_sales <= max;
        });
        const cps = num(tier?.commission_per_sale);
        const commission = cps * r.total_sales;
        return {
          owner_id: u.user.id,
          week_start: r.week_start,
          agent: r.agent,
          total_sales: r.total_sales,
          commission_per_sale: cps,
          sales_commission: commission,
          personal_lead_incentive: r.personal_lead_incentive,
          total_agent_pay: commission + r.personal_lead_incentive,
          ringba_sales: r.ringba_sales,
          paid_calls: r.paid_calls,
          ringba_cost: r.ringba_cost,
          notes: tier?.tier_name ? `Tier: ${tier.tier_name}` : null,
        };
      });

      if (replace) {
        await client.from("insurance_payroll").delete().gte("week_start", start).lt("week_start", end);
      }
      if (inserts.length) {
        const { error } = await client.from("insurance_payroll").insert(inserts);
        if (error) throw error;
      }
      toast.success(`Generated ${inserts.length} payroll rows`);
      onDone();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate weekly payroll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Aggregates Sales Log &amp; Ringba by <b>week + agent</b> in the selected date range, matches each agent to a commission tier, and writes the rows into the Weekly Payroll sheet where you can edit them by hand.
          </p>
          <label className="flex items-center gap-2 text-foreground">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-primary" />
            Replace existing payroll rows in this range first
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={busy}>{busy ? "Generating…" : "Generate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ */
/* CEO Dashboard                                                  */
/* ------------------------------------------------------------ */

function CeoDashboard({ range }: { range: DateRange }) {
  const { start, end } = rangeToIso(range);
  const client = supabase as any;

  const sales = useQuery({
    queryKey: ["ins", "insurance_sales", { start, end }],
    queryFn: async () => {
      const { data, error } = await client.from("insurance_sales").select("*")
        .gte("sale_date", start).lt("sale_date", end);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const ringba = useQuery({
    queryKey: ["ins", "insurance_ringba", { start, end }],
    queryFn: async () => {
      const { data, error } = await client.from("insurance_ringba").select("*")
        .gte("entry_date", start).lt("entry_date", end);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const daily = useQuery({
    queryKey: ["ins", "insurance_agent_daily", { start, end }],
    queryFn: async () => {
      const { data, error } = await client.from("insurance_agent_daily").select("*")
        .gte("entry_date", start).lt("entry_date", end);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const payroll = useQuery({
    queryKey: ["ins", "insurance_payroll", { start, end }],
    queryFn: async () => {
      const { data, error } = await client.from("insurance_payroll").select("*")
        .gte("week_start", start).lt("week_start", end);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const salesRows = sales.data ?? [];
  const ringbaRows = ringba.data ?? [];
  const dailyRows = daily.data ?? [];
  const payrollRows = payroll.data ?? [];

  const totals = useMemo(() => {
    const counted = salesRows.filter((s) => s.count_sale !== false);
    const totalSales = counted.length;
    const policyAmount = counted.reduce((s, r) => s + num(r.policy_amount), 0);
    const monthlyPremium = counted.reduce((s, r) => s + num(r.monthly_premium), 0);
    const personalLead = counted.reduce((s, r) => s + num(r.personal_lead_incentive), 0);
    const ringbaCost = ringbaRows.reduce((s, r) => s + num(r.cost_to_ray), 0);
    const paidCalls = ringbaRows.reduce((s, r) => s + num(r.paid_calls), 0);
    const incoming = ringbaRows.reduce((s, r) => s + num(r.incoming), 0);
    const connected = ringbaRows.reduce((s, r) => s + num(r.connected), 0);
    const ringbaSales = ringbaRows.reduce((s, r) => s + num(r.ringba_sales), 0);
    const shiftHours = dailyRows.reduce((s, r) => s + num(r.shift_hours), 0);
    const agentPay = payrollRows.reduce((s, r) => s + num(r.total_agent_pay), 0);
    const annualized = monthlyPremium * 12;
    return {
      totalSales, policyAmount, monthlyPremium, annualized,
      personalLead, ringbaCost, paidCalls, incoming, connected, ringbaSales,
      shiftHours, agentPay,
      costPerRingbaSale: ringbaSales ? ringbaCost / ringbaSales : 0,
      costPerPaidCall: paidCalls ? ringbaCost / paidCalls : 0,
      connectRate: incoming ? connected / incoming : 0,
      salesPerHour: shiftHours ? totalSales / shiftHours : 0,
      net: annualized - ringbaCost - personalLead - agentPay,
    };
  }, [salesRows, ringbaRows, dailyRows, payrollRows]);

  const byAgent = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of salesRows) {
      const key = s.agent || "—";
      const cur = map.get(key) || { agent: key, sales: 0, policy: 0, premium: 0, ringbaSales: 0, personalLead: 0 };
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
      const cur = map.get(key) || { agent: key, sales: 0, policy: 0, premium: 0, ringbaSales: 0, personalLead: 0 };
      cur.pay = (cur.pay || 0) + num(p.total_agent_pay);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.premium - a.premium);
  }, [salesRows, payrollRows]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Sales" value={totals.totalSales} />
        <Kpi label="Policy Amount" value={fmtMoney(totals.policyAmount)} />
        <Kpi label="Monthly Premium" value={fmtMoney(totals.monthlyPremium)} tone="primary" />
        <Kpi label="Annualized" value={fmtMoney(totals.annualized)} tone="primary" />
        <Kpi label="Ringba Cost" value={fmtMoney(totals.ringbaCost)} tone="destructive" />
        <Kpi label="Agent Pay" value={fmtMoney(totals.agentPay)} tone="destructive" />
        <Kpi label="Cost / Ringba Sale" value={fmtMoney(totals.costPerRingbaSale)} />
        <Kpi label="Net Contribution" value={fmtMoney(totals.net)} tone={totals.net >= 0 ? "primary" : "destructive"} />
        <Kpi label="Incoming Calls" value={totals.incoming.toLocaleString()} />
        <Kpi label="Connected Calls" value={totals.connected.toLocaleString()} />
        <Kpi label="Connect Rate" value={`${(totals.connectRate * 100).toFixed(1)}%`} />
        <Kpi label="Sales / Hour" value={totals.salesPerHour.toFixed(2)} />
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
                  <th className="text-right">Personal Lead</th>
                  <th className="text-right">Total Pay</th>
                </tr>
              </thead>
              <tbody>
                {byAgent.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-6 text-muted-foreground text-xs">No sales in range.</td></tr>
                )}
                {byAgent.map((a) => (
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trash2, Download, Columns3, RefreshCw } from "lucide-react";
import { fmtMoney, rangeToIso, type DateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  SHEETS,
  type Col,
  type ColType,
  type SheetKey,
  useIsCEO,
  num,
  isoOf,
  weekStartOf,
  derivePayroll,
} from "./shared";

export function SheetGrid({ sheetKey, range, agents }: { sheetKey: SheetKey; range: DateRange; agents: string[] }) {
  const { data: isCEO = false } = useIsCEO();
  const cfg = SHEETS[sheetKey];
  const qc = useQueryClient();
  const client = supabase as any;
  const { start, end } = rangeToIso(range);
  const hasAgentCol = cfg.cols.some((c) => c.key === "agent");
  const activeAgents = hasAgentCol ? agents : [];
  const effectiveStart = cfg.dateKey === "week_start"
    ? (() => { const d = new Date(range.from); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })()
    : start;
  const [addColOpen, setAddColOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);

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
      ...cfg.cols.filter((c) => (c.ceoOnly ? isCEO : true)),
      ...customCols.map((c: any) => ({
        key: c.col_key,
        label: c.label,
        type: c.col_type as ColType,
        custom: true,
      })),
    ],
    [cfg.cols, customCols, isCEO],
  );

  const { data: rows = [] } = useQuery({
    queryKey: ["ins", cfg.table, cfg.dateKey ? { start: effectiveStart, end } : null, activeAgents],
    queryFn: async () => {
      let q = client.from(cfg.table).select("*").order("created_at", { ascending: false }).limit(1000);
      if (cfg.dateKey) q = q.gte(cfg.dateKey, effectiveStart).lt(cfg.dateKey, end);
      if (activeAgents.length) q = q.in("agent", activeAgents);
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

  const cellValue = (r: any, c: Col) =>
    c.computed ? c.computed(r) : c.custom ? r.extra?.[c.key] : r[c.key];

  const exportCsv = () => {
    const headers = allCols.map((c) => c.label);
    const escape = (v: any) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((r: any) => allCols.map((c) => escape(cellValue(r, c))).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cfg.table}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of allCols) {
      if (c.type === "number") {
        t[c.key] = rows.reduce((s: number, r: any) => s + num(cellValue(r, c)), 0);
      }
    }
    return t;
  }, [allCols, rows]);

  const reportKpis = cfg.report ? cfg.report(rows, isCEO) : [];

  return (
    <div className="space-y-4">
      {reportKpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {reportKpis.map((k) => (
            <Card key={k.label} className="border-border/60 shadow-soft">
              <CardContent className="p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{k.label}</div>
                <div className={cn(
                  "font-display font-semibold text-lg mt-0.5 tabular-nums",
                  k.tone === "primary" && "text-primary",
                  k.tone === "destructive" && "text-destructive",
                  k.tone === "muted" && "text-muted-foreground",
                )}>{k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {rows.length} row{rows.length === 1 ? "" : "s"} {cfg.dateKey ? "in range" : "total"}
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

          <div className="overflow-auto border border-border/60 rounded-md max-h-[72vh]">
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
                      const v = cellValue(r, c);
                      if (c.computed) {
                        return (
                          <td key={c.key} className="border-b border-r border-border/40 px-2 py-1.5 bg-primary/5">
                            <span className="font-mono tabular-nums block text-right text-primary">
                              {fmtMoney(num(v))}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={c.key} className="border-b border-r border-border/40 p-0">
                          <Cell value={v} type={c.type} onCommit={(val) => updateCell(r.id, c, val)} />
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
      </Card>

      <AddColumnDialog
        open={addColOpen}
        onOpenChange={setAddColOpen}
        sheetKey={sheetKey}
        existingKeys={allCols.map((c) => c.key)}
        nextPosition={customCols.length}
        onAdded={() => qc.invalidateQueries({ queryKey: ["ins-cols", sheetKey] })}
      />
      {sheetKey === "payroll" && (
        <GeneratePayrollDialog open={genOpen} onOpenChange={setGenOpen} range={range} onDone={invalidate} />
      )}
    </div>
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

function AddColumnDialog({
  open, onOpenChange, sheetKey, existingKeys, nextPosition, onAdded,
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

function GeneratePayrollDialog({
  open, onOpenChange, range, onDone,
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

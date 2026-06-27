import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { businessesQuery, categoriesQuery } from "@/lib/queries";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Copy, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { suggestCategory } from "@/lib/ai.functions";

type Row = {
  key: string;
  type: "expense" | "income";
  business_id: string;
  category_id: string;
  amount: string;
  vendor: string;
  description: string;
  date: string;
  suggesting?: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);

const blankRow = (defaults: Partial<Row> = {}): Row => ({
  key: uid(),
  type: "expense",
  business_id: "",
  category_id: "",
  amount: "",
  vendor: "",
  description: "",
  date: today(),
  ...defaults,
});

export function TransactionDialog({
  open,
  onOpenChange,
  defaultBusinessId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultBusinessId?: string;
}) {
  const qc = useQueryClient();
  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const suggestFn = useServerFn(suggestCategory);

  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const biz = defaultBusinessId ?? businesses[0]?.id ?? "";
      setRows([blankRow({ business_id: biz })]);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open, defaultBusinessId, businesses]);

  const updateRow = useCallback((key: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback((from?: Row) => {
    const last = from ?? rows[rows.length - 1];
    setRows((rs) => [
      ...rs,
      blankRow({
        type: last?.type ?? "expense",
        business_id: last?.business_id ?? defaultBusinessId ?? businesses[0]?.id ?? "",
        date: last?.date ?? today(),
      }),
    ]);
  }, [rows, defaultBusinessId, businesses]);

  const duplicateRow = (r: Row) => {
    setRows((rs) => {
      const i = rs.findIndex((x) => x.key === r.key);
      const copy = { ...r, key: uid() };
      return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
    });
  };

  const removeRow = (key: string) =>
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));

  const aiSuggest = async (r: Row) => {
    if (!r.description && !r.vendor) return toast.error("Add vendor or description first");
    updateRow(r.key, { suggesting: true });
    try {
      const cats = categories.filter(
        (c) => c.type === r.type && (c.business_id === null || c.business_id === r.business_id),
      );
      const result = await suggestFn({
        data: {
          description: `${r.vendor} ${r.description}`.trim(),
          type: r.type,
          categories: cats.map((c) => c.name),
        },
      });
      const match = cats.find((c) => c.name.toLowerCase() === result.category.toLowerCase());
      if (match) {
        updateRow(r.key, { category_id: match.id, suggesting: false });
        toast.success(`Suggested: ${match.name}`);
      } else {
        updateRow(r.key, { suggesting: false });
        toast.info(`AI suggested "${result.category}" — not in your list`);
      }
    } catch (e: any) {
      updateRow(r.key, { suggesting: false });
      toast.error(e.message ?? "AI suggestion failed");
    }
  };

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const r of rows) {
      const a = parseFloat(r.amount) || 0;
      if (r.type === "income") income += a;
      else expense += a;
    }
    return { income, expense, net: income - expense };
  }, [rows]);

  const validRows = rows.filter((r) => r.business_id && parseFloat(r.amount) > 0);

  const saveAll = async () => {
    if (validRows.length === 0) return toast.error("Enter at least one row with business + amount");
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = validRows.map((r) => ({
      business_id: r.business_id,
      category_id: r.category_id || null,
      type: r.type,
      amount: parseFloat(r.amount),
      description: r.description || null,
      vendor: r.vendor || null,
      transaction_date: r.date,
      user_id: userData.user!.id,
    }));
    const { error } = await supabase.from("transactions").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${payload.length} transaction${payload.length > 1 ? "s" : ""}`);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3">
            Quick entry
            <span className="text-xs font-normal text-muted-foreground">
              Tab to move · Enter to add row
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-3 py-2 max-h-[60vh] overflow-auto">
          <div className="hidden md:grid grid-cols-[110px_1fr_1.2fr_1.2fr_1fr_120px_60px] gap-2 px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div>Type</div>
            <div>Business</div>
            <div>Vendor / Payer</div>
            <div>Category</div>
            <div>Amount</div>
            <div>Date</div>
            <div></div>
          </div>

          <div className="space-y-1.5">
            {rows.map((r, idx) => {
              const cats = categories.filter(
                (c) => c.type === r.type && (c.business_id === null || c.business_id === r.business_id),
              );
              return (
                <div
                  key={r.key}
                  className="grid grid-cols-1 md:grid-cols-[110px_1fr_1.2fr_1.2fr_1fr_120px_60px] gap-2 items-center rounded-lg border border-border/60 bg-card/30 p-2"
                >
                  {/* Type toggle */}
                  <div className="flex rounded-md border border-border overflow-hidden h-9">
                    <button
                      type="button"
                      onClick={() => updateRow(r.key, { type: "expense", category_id: "" })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 text-xs font-medium transition-colors",
                        r.type === "expense"
                          ? "bg-destructive/15 text-destructive"
                          : "text-muted-foreground hover:bg-muted/40",
                      )}
                      title="Debit / Expense"
                    >
                      <ArrowDownCircle className="h-3.5 w-3.5" /> Dr
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRow(r.key, { type: "income", category_id: "" })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 text-xs font-medium transition-colors border-l border-border",
                        r.type === "income"
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-muted/40",
                      )}
                      title="Credit / Income"
                    >
                      <ArrowUpCircle className="h-3.5 w-3.5" /> Cr
                    </button>
                  </div>

                  {/* Business */}
                  <Select value={r.business_id} onValueChange={(v) => updateRow(r.key, { business_id: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Business" /></SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Vendor */}
                  <Input
                    ref={idx === 0 ? firstInputRef : undefined}
                    placeholder="Vendor / notes"
                    value={r.vendor}
                    onChange={(e) => updateRow(r.key, { vendor: e.target.value })}
                    className="h-9"
                  />

                  {/* Category with AI */}
                  <div className="flex gap-1">
                    <Select value={r.category_id} onValueChange={(v) => updateRow(r.key, { category_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {cats.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => aiSuggest(r)}
                      disabled={r.suggesting}
                      title="AI suggest category"
                      className="h-9 w-9 shrink-0"
                    >
                      {r.suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  {/* Amount */}
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={r.amount}
                    onChange={(e) => updateRow(r.key, { amount: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (idx === rows.length - 1) addRow(r);
                      }
                    }}
                    className={cn(
                      "h-9 text-right font-medium tabular-nums",
                      r.type === "income" ? "text-primary" : "text-destructive",
                    )}
                  />

                  {/* Date */}
                  <Input
                    type="date"
                    value={r.date}
                    onChange={(e) => updateRow(r.key, { date: e.target.value })}
                    className="h-9"
                  />

                  {/* Actions */}
                  <div className="flex justify-end gap-0.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateRow(r)} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeRow(r.key)}
                      disabled={rows.length === 1}
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="ghost" size="sm" className="mt-2 gap-1.5" onClick={() => addRow()}>
            <Plus className="h-4 w-4" /> Add row
          </Button>
        </div>

        <div className="border-t border-border px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-5 text-xs">
            <span className="text-muted-foreground">
              Credit <span className="text-primary font-semibold tabular-nums">${totals.income.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">
              Debit <span className="text-destructive font-semibold tabular-nums">${totals.expense.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">
              Net <span className={cn("font-semibold tabular-nums", totals.net >= 0 ? "text-primary" : "text-destructive")}>
                ${totals.net.toFixed(2)}
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={saveAll} disabled={saving || validRows.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save {validRows.length > 0 ? `${validRows.length} ` : ""}entry{validRows.length === 1 ? "" : "ies"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

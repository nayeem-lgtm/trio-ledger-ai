import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { businessesQuery, categoriesQuery, transactionsQuery } from "@/lib/queries";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { TransactionDialog } from "@/components/TransactionDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TxnsPage,
});

function TxnsPage() {
  const [open, setOpen] = useState(false);
  const [bizFilter, setBizFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: txns = [] } = useQuery(transactionsQuery());
  const qc = useQueryClient();

  const filtered = useMemo(() => {
    return txns.filter((t: any) => {
      if (bizFilter !== "all" && t.business_id !== bizFilter) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${t.vendor ?? ""} ${t.description ?? ""} ${t.categories?.name ?? ""} ${t.businesses?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [txns, bizFilter, typeFilter, search]);

  const del = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} of {txns.length} records</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Search vendor, description, category…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={bizFilter} onValueChange={setBizFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All businesses</SelectItem>
                {businesses.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-4 group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.businesses?.color ?? "#64748b" }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.vendor ?? t.description ?? t.categories?.name ?? "Transaction"}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.transaction_date} · {t.businesses?.name} · {t.categories?.name ?? "Uncategorized"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`font-semibold ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                    {t.type === "income" ? "+" : "−"}{fmtMoney(Number(t.amount))}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del(t.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">No transactions match your filters.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

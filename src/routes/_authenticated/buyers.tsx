import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, CalendarClock, FileText } from "lucide-react";
import {
  listBuyers, saveBuyer, deleteBuyer,
  listBuyerReceipts, saveBuyerReceipt, markReceiptReceived, deleteReceipt,
} from "@/lib/buyers.functions";
import { businessesQuery, categoriesQuery } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buyers")({
  component: BuyersPage,
});

const TERMS = [
  { v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" }, { v: "biweekly", l: "Bi-weekly" },
  { v: "monthly", l: "Monthly" }, { v: "quarterly", l: "Quarterly" },
  { v: "custom", l: "Custom" }, { v: "on_receipt", l: "On receipt" },
];

function BuyersPage() {
  const listFn = useServerFn(listBuyers);
  const listRecFn = useServerFn(listBuyerReceipts);
  const delFn = useServerFn(deleteBuyer);
  const qc = useQueryClient();

  const { data: buyers = [] } = useQuery({ queryKey: ["buyers"], queryFn: () => listFn() });
  const { data: receipts = [] } = useQuery({ queryKey: ["buyer_receipts"], queryFn: () => listRecFn({ data: {} }) });

  const [editing, setEditing] = useState<any | null>(null);
  const [openBuyer, setOpenBuyer] = useState(false);
  const [recDialog, setRecDialog] = useState<{ open: boolean; buyer: any; receipt?: any }>({ open: false, buyer: null });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = buyers.find((b: any) => b.id === selectedId) ?? buyers[0];
  const selRecs = useMemo(() => receipts.filter((r: any) => !selected || r.buyer_id === selected?.id), [receipts, selected]);

  const totals = useMemo(() => {
    let received = 0, pending = 0;
    for (const r of receipts) {
      if (r.status === "paid") received += Number(r.amount);
      else if (r.status === "pending" || r.status === "overdue") pending += Number(r.amount);
    }
    return { received, pending };
  }, [receipts]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this buyer and all their receipts?")) return;
    await delFn({ data: { id } });
    toast.success("Buyer deleted");
    qc.invalidateQueries({ queryKey: ["buyers"] });
    qc.invalidateQueries({ queryKey: ["buyer_receipts"] });
  };

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Accounts receivable</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Buyers</h1>
            <p className="text-sm text-muted-foreground mt-1">Track everyone who pays you and their billing schedules.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/invoices"><Button variant="outline" className="gap-2"><FileText className="h-4 w-4" />Invoices</Button></Link>
            <Button onClick={() => { setEditing(null); setOpenBuyer(true); }} className="gap-2"><Plus className="h-4 w-4" />New buyer</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total received</div><div className="text-2xl font-semibold mt-1 text-emerald-500">{fmtMoney(totals.received)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-2xl font-semibold mt-1 text-amber-500">{fmtMoney(totals.pending)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Buyers</div><div className="text-2xl font-semibold mt-1">{buyers.length}</div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base">Buyers</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {buyers.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No buyers yet.</div>}
                {buyers.map((b: any) => (
                  <button key={b.id} onClick={() => setSelectedId(b.id)} className={`w-full text-left p-4 hover:bg-muted/40 transition ${selected?.id === b.id ? "bg-muted/60" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{b.company ?? b.email ?? "—"}</div>
                      </div>
                      <Badge variant="outline" className="capitalize">{b.payment_terms.replace("_", " ")}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{selected?.name ?? "Select a buyer"}</CardTitle>
                {selected && <div className="text-xs text-muted-foreground mt-1">{selected.company ?? selected.email ?? ""}</div>}
              </div>
              {selected && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(selected); setOpenBuyer(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(selected.id)}><Trash2 className="h-4 w-4" /></Button>
                  <Button size="sm" className="gap-2" onClick={() => setRecDialog({ open: true, buyer: selected })}><Plus className="h-4 w-4" />Log receipt</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {selected ? (
                <div className="divide-y divide-border">
                  {selRecs.length === 0 && <div className="p-8 text-sm text-muted-foreground text-center">No receipts yet.</div>}
                  {selRecs.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-8 w-8 rounded-full grid place-items-center ${r.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                          {r.status === "paid" ? <Check className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{fmtMoney(Number(r.amount))} <span className="text-xs text-muted-foreground ml-2 capitalize">{r.status}</span></div>
                          <div className="text-xs text-muted-foreground">
                            {r.period_start || r.period_end ? `Period: ${r.period_start ?? "?"} → ${r.period_end ?? "?"}` : ""}
                            {r.expected_date ? ` · Expected ${r.expected_date}` : ""}
                            {r.received_date ? ` · Received ${r.received_date}` : ""}
                            {r.reference ? ` · ${r.reference}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setRecDialog({ open: true, buyer: selected, receipt: r })}><Pencil className="h-4 w-4" /></Button>
                        {r.status !== "paid" && <MarkReceived id={r.id} />}
                        <DelReceipt id={r.id} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-sm text-muted-foreground text-center">Add a buyer to start tracking receipts.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <BuyerDialog open={openBuyer} onOpenChange={setOpenBuyer} editing={editing} />
        <ReceiptDialog open={recDialog.open} onOpenChange={(o: boolean) => setRecDialog({ ...recDialog, open: o })} buyer={recDialog.buyer} receipt={recDialog.receipt} />
      </div>
    </AppShell>
  );
}

function MarkReceived({ id }: { id: string }) {
  const fn = useServerFn(markReceiptReceived);
  const qc = useQueryClient();
  return (
    <Button size="sm" variant="outline" onClick={async () => {
      await fn({ data: { id, received_date: new Date().toISOString().slice(0, 10) } });
      toast.success("Marked received & synced");
      qc.invalidateQueries({ queryKey: ["buyer_receipts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }}>Mark received</Button>
  );
}

function DelReceipt({ id }: { id: string }) {
  const fn = useServerFn(deleteReceipt);
  const qc = useQueryClient();
  return (
    <Button size="sm" variant="ghost" onClick={async () => {
      if (!confirm("Delete receipt?")) return;
      await fn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["buyer_receipts"] });
    }}><Trash2 className="h-4 w-4" /></Button>
  );
}

function BuyerDialog({ open, onOpenChange, editing }: any) {
  const save = useServerFn(saveBuyer);
  const qc = useQueryClient();
  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (!open) return;
    setF(editing ?? {
      name: "", email: "", phone: "", company: "", address: "", tax_id: "",
      payment_terms: "monthly", currency: "USD", notes: "",
      default_business_id: null, default_category_id: null,
    });
  }, [open, editing]);

  const submit = async () => {
    if (!f.name?.trim()) return toast.error("Name required");
    try {
      await save({ data: {
        id: editing?.id,
        name: f.name.trim(),
        email: f.email || null,
        phone: f.phone || null,
        company: f.company || null,
        address: f.address || null,
        tax_id: f.tax_id || null,
        payment_terms: f.payment_terms || "monthly",
        custom_days: f.custom_days ? Number(f.custom_days) : null,
        currency: f.currency || "USD",
        notes: f.notes || null,
        default_business_id: f.default_business_id || null,
        default_category_id: f.default_category_id || null,
      }});
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["buyers"] });
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit buyer" : "New buyer"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name *"><Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Company"><Input value={f.company ?? ""} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Address" className="col-span-2"><Textarea value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="Tax ID"><Input value={f.tax_id ?? ""} onChange={(e) => setF({ ...f, tax_id: e.target.value })} /></Field>
          <Field label="Currency"><Input value={f.currency ?? "USD"} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field>
          <Field label="Payment terms">
            <Select value={f.payment_terms ?? "monthly"} onValueChange={(v) => setF({ ...f, payment_terms: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TERMS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {f.payment_terms === "custom" && (
            <Field label="Days"><Input type="number" value={f.custom_days ?? ""} onChange={(e) => setF({ ...f, custom_days: e.target.value })} /></Field>
          )}
          <Field label="Default entity">
            <Select value={f.default_business_id ?? "none"} onValueChange={(v) => setF({ ...f, default_business_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {businesses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default category">
            <Select value={f.default_category_id ?? "none"} onValueChange={(v) => setF({ ...f, default_category_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {categories.filter((c: any) => c.type === "income").map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes" className="col-span-2"><Textarea value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDialog({ open, onOpenChange, buyer, receipt }: any) {
  const save = useServerFn(saveBuyerReceipt);
  const qc = useQueryClient();
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (!open) return;
    setF({
      amount: receipt?.amount ?? "",
      currency: receipt?.currency ?? buyer?.currency ?? "USD",
      period_start: receipt?.period_start ?? "",
      period_end: receipt?.period_end ?? "",
      expected_date: receipt?.expected_date ?? "",
      received_date: receipt?.received_date ?? "",
      status: receipt?.status ?? "pending",
      reference: receipt?.reference ?? "",
      notes: receipt?.notes ?? "",
    });
  }, [open, receipt, buyer]);

  if (!buyer) return null;
  const submit = async () => {
    if (!f.amount) return toast.error("Amount required");
    await save({ data: {
      id: receipt?.id,
      buyer_id: buyer.id,
      amount: Number(f.amount),
      currency: f.currency || "USD",
      period_start: f.period_start || null,
      period_end: f.period_end || null,
      expected_date: f.expected_date || null,
      received_date: f.received_date || null,
      status: f.status,
      reference: f.reference || null,
      notes: f.notes || null,
    }});
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["buyer_receipts"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Receipt · {buyer.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount *"><Input type="number" step="0.01" value={f.amount ?? ""} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Currency"><Input value={f.currency ?? "USD"} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field>
          <Field label="Period start"><Input type="date" value={f.period_start ?? ""} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></Field>
          <Field label="Period end"><Input type="date" value={f.period_end ?? ""} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></Field>
          <Field label="Expected"><Input type="date" value={f.expected_date ?? ""} onChange={(e) => setF({ ...f, expected_date: e.target.value })} /></Field>
          <Field label="Received"><Input type="date" value={f.received_date ?? ""} onChange={(e) => setF({ ...f, received_date: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={f.status ?? "pending"} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference"><Input value={f.reference ?? ""} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
          <Field label="Notes" className="col-span-2"><Textarea value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = "" }: any) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

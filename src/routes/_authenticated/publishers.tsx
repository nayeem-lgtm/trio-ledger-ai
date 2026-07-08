import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Plus, Trash2, Pencil, Check, CircleDollarSign, CalendarClock } from "lucide-react";
import {
  listPublishers,
  savePublisher,
  deletePublisher,
  savePublisherPayment,
  listPublisherPayments,
  markPaymentPaid,
  deletePayment,
} from "@/lib/publishers.functions";
import { useQuery as useQ } from "@tanstack/react-query";
import { businessesQuery, categoriesQuery } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/publishers")({
  component: PublishersPage,
});

const TERMS = [
  { v: "daily", l: "Daily" },
  { v: "weekly", l: "Weekly" },
  { v: "biweekly", l: "Bi-weekly" },
  { v: "monthly", l: "Monthly" },
  { v: "quarterly", l: "Quarterly" },
  { v: "custom", l: "Custom (N days)" },
  { v: "on_receipt", l: "On receipt" },
] as const;

function PublishersPage() {
  const listFn = useServerFn(listPublishers);
  const listPayFn = useServerFn(listPublisherPayments);
  const delFn = useServerFn(deletePublisher);
  const qc = useQueryClient();

  const { data: publishers = [] } = useQuery({ queryKey: ["publishers"], queryFn: () => listFn() });
  const { data: payments = [] } = useQuery({ queryKey: ["publisher_payments"], queryFn: () => listPayFn({ data: {} }) });

  const [editing, setEditing] = useState<any | null>(null);
  const [openPub, setOpenPub] = useState(false);
  const [payDialog, setPayDialog] = useState<{ open: boolean; publisher: any; payment?: any }>({ open: false, publisher: null });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = publishers.find((p: any) => p.id === selectedId) ?? publishers[0];

  const selPayments = useMemo(
    () => payments.filter((p: any) => !selected || p.publisher_id === selected?.id),
    [payments, selected],
  );

  const totals = useMemo(() => {
    let paid = 0, pending = 0;
    for (const p of payments) {
      if (p.status === "paid") paid += Number(p.amount);
      else if (p.status === "pending" || p.status === "overdue") pending += Number(p.amount);
    }
    return { paid, pending };
  }, [payments]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this publisher and all their payment records?")) return;
    await delFn({ data: { id } });
    toast.success("Publisher deleted");
    qc.invalidateQueries({ queryKey: ["publishers"] });
    qc.invalidateQueries({ queryKey: ["publisher_payments"] });
  };

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Accounts payable</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Publishers</h1>
            <p className="text-sm text-muted-foreground mt-1">Track everyone you pay and their payment schedules.</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpenPub(true); }} className="gap-2"><Plus className="h-4 w-4" />New publisher</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total paid</div><div className="text-2xl font-semibold mt-1">{fmtMoney(totals.paid)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-2xl font-semibold mt-1 text-amber-500">{fmtMoney(totals.pending)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Publishers</div><div className="text-2xl font-semibold mt-1">{publishers.length}</div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base">Publishers</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {publishers.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground text-center">No publishers yet.</div>
                )}
                {publishers.map((p: any) => (
                  <div
                    key={p.id}
                    className={`w-full flex items-stretch hover:bg-muted/40 transition ${selected?.id === p.id ? "bg-muted/60" : ""}`}
                  >
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className="flex-1 text-left p-4 min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.email ?? p.company ?? "—"}</div>
                        </div>
                        <Badge variant="outline" className="capitalize shrink-0">{p.payment_terms.replace("_", " ")}</Badge>
                      </div>
                    </button>
                    <Link
                      to="/publishers/$publisherId"
                      params={{ publisherId: p.id }}
                      className="px-3 grid place-items-center text-xs text-muted-foreground hover:text-foreground border-l border-border"
                    >
                      Open →
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{selected?.name ?? "Select a publisher"}</CardTitle>
                {selected && <div className="text-xs text-muted-foreground mt-1">{selected.company ?? selected.email ?? ""}</div>}
              </div>
              {selected && (
                <div className="flex gap-2">
                  <Link to="/publishers/$publisherId" params={{ publisherId: selected.id }}>
                    <Button size="sm" variant="outline">Open detail</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(selected); setOpenPub(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(selected.id)}><Trash2 className="h-4 w-4" /></Button>
                  <Button size="sm" className="gap-2" onClick={() => setPayDialog({ open: true, publisher: selected })}>
                    <Plus className="h-4 w-4" />Log payment
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {selected ? (
                <div className="divide-y divide-border">
                  {selPayments.length === 0 && (
                    <div className="p-8 text-sm text-muted-foreground text-center">No payment records for this publisher yet.</div>
                  )}
                  {selPayments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-8 w-8 rounded-full grid place-items-center ${p.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                          {p.status === "paid" ? <Check className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{fmtMoney(Number(p.amount))} <span className="text-xs text-muted-foreground ml-2 capitalize">{p.status}</span></div>
                          <div className="text-xs text-muted-foreground">
                            {p.period_start || p.period_end ? `Period: ${p.period_start ?? "?"} → ${p.period_end ?? "?"}` : ""}
                            {p.due_date ? ` · Due ${p.due_date}` : ""}
                            {p.payment_date ? ` · Paid ${p.payment_date}` : ""}
                            {p.reference ? ` · ${p.reference}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setPayDialog({ open: true, publisher: selected, payment: p })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {p.status !== "paid" && (
                          <MarkPaidButton id={p.id} />
                        )}
                        <DeletePayBtn id={p.id} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-sm text-muted-foreground text-center">Add a publisher to start tracking payments.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <PublisherDialog open={openPub} onOpenChange={setOpenPub} editing={editing} />
        <PaymentDialog
          open={payDialog.open}
          onOpenChange={(o) => setPayDialog({ ...payDialog, open: o })}
          publisher={payDialog.publisher}
          payment={payDialog.payment}
        />
      </div>
    </AppShell>
  );
}

function MarkPaidButton({ id }: { id: string }) {
  const fn = useServerFn(markPaymentPaid);
  const qc = useQueryClient();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await fn({ data: { id, payment_date: new Date().toISOString().slice(0, 10) } });
          toast.success("Marked paid & synced to Transactions");
          qc.invalidateQueries({ queryKey: ["publisher_payments"] });
          qc.invalidateQueries({ queryKey: ["transactions"] });
        } catch (e: any) {
          toast.error(e.message ?? "Failed");
        }
      }}
    >
      <CircleDollarSign className="h-4 w-4 mr-1" />Mark paid
    </Button>
  );
}

function DeletePayBtn({ id }: { id: string }) {
  const fn = useServerFn(deletePayment);
  const qc = useQueryClient();
  return (
    <Button size="sm" variant="ghost" onClick={async () => {
      if (!confirm("Delete payment record?")) return;
      await fn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["publisher_payments"] });
      toast.success("Deleted");
    }}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function PublisherDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null }) {
  const save = useServerFn(savePublisher);
  const qc = useQueryClient();
  const { data: businesses = [] } = useQ(businessesQuery);
  const { data: categories = [] } = useQ(categoriesQuery);
  const [f, setF] = useState<any>({
    name: "", email: "", phone: "", company: "", payment_terms: "monthly", custom_days: null,
    default_amount: null, currency: "USD", notes: "",
    default_business_id: null, default_category_id: null,
  });

  useMemoInit(open, editing, setF);

  const submit = async () => {
    if (!f.name.trim()) return toast.error("Name required");
    try {
      await save({ data: {
        id: editing?.id,
        name: f.name.trim(),
        email: f.email || null,
        phone: f.phone || null,
        company: f.company || null,
        payment_terms: f.payment_terms,
        custom_days: f.custom_days ? Number(f.custom_days) : null,
        default_amount: f.default_amount ? Number(f.default_amount) : null,
        currency: f.currency || "USD",
        notes: f.notes || null,
        default_business_id: f.default_business_id || null,
        default_category_id: f.default_category_id || null,
        bank_details: {},
      }});
      toast.success(editing ? "Publisher updated" : "Publisher added");
      qc.invalidateQueries({ queryKey: ["publishers"] });
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit publisher" : "New publisher"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Company"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Payment terms">
            <Select value={f.payment_terms} onValueChange={(v) => setF({ ...f, payment_terms: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TERMS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {f.payment_terms === "custom" && (
            <Field label="Days"><Input type="number" value={f.custom_days ?? ""} onChange={(e) => setF({ ...f, custom_days: e.target.value })} /></Field>
          )}
          <Field label="Default amount"><Input type="number" step="0.01" value={f.default_amount ?? ""} onChange={(e) => setF({ ...f, default_amount: e.target.value })} /></Field>
          <Field label="Currency"><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field>
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
                {categories.filter((c: any) => c.type === "expense").map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes" className="col-span-2"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ open, onOpenChange, publisher, payment }: { open: boolean; onOpenChange: (v: boolean) => void; publisher: any; payment?: any }) {
  const save = useServerFn(savePublisherPayment);
  const qc = useQueryClient();
  const [f, setF] = useState<any>({
    amount: "", currency: "USD",
    period_start: "", period_end: "", due_date: "", payment_date: "",
    status: "pending", reference: "", notes: "",
  });
  useMemoInit(open, payment, (v: any) => setF({
    amount: v?.amount ?? publisher?.default_amount ?? "",
    currency: v?.currency ?? publisher?.currency ?? "USD",
    period_start: v?.period_start ?? "", period_end: v?.period_end ?? "",
    due_date: v?.due_date ?? "", payment_date: v?.payment_date ?? "",
    status: v?.status ?? "pending",
    reference: v?.reference ?? "", notes: v?.notes ?? "",
  }));

  if (!publisher) return null;
  const submit = async () => {
    if (!f.amount) return toast.error("Amount required");
    await save({ data: {
      id: payment?.id,
      publisher_id: publisher.id,
      amount: Number(f.amount),
      currency: f.currency || "USD",
      period_start: f.period_start || null,
      period_end: f.period_end || null,
      due_date: f.due_date || null,
      payment_date: f.payment_date || null,
      status: f.status,
      reference: f.reference || null,
      notes: f.notes || null,
    }});
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["publisher_payments"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Payment · {publisher.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount *"><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Currency"><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field>
          <Field label="Period start"><Input type="date" value={f.period_start} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></Field>
          <Field label="Period end"><Input type="date" value={f.period_end} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></Field>
          <Field label="Due date"><Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          <Field label="Payment date"><Input type="date" value={f.payment_date} onChange={(e) => setF({ ...f, payment_date: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference / invoice #"><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
          <Field label="Notes" className="col-span-2"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = "" }: { label: string; children: any; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// helper: initialize form when dialog opens
import { useEffect } from "react";
function useMemoInit(open: boolean, source: any, apply: (v: any) => void) {
  useEffect(() => {
    if (!open) return;
    apply(source ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);
}

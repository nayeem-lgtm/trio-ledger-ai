import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  CalendarClock,
  CircleDollarSign,
  Save,
} from "lucide-react";
import {
  listPublishers,
  savePublisher,
  listPublisherPayments,
  savePublisherPayment,
  markPaymentPaid,
  deletePayment,
} from "@/lib/publishers.functions";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/publishers/$publisherId")({
  component: PublisherDetail,
});

function PublisherDetail() {
  const { publisherId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const listFn = useServerFn(listPublishers);
  const listPayFn = useServerFn(listPublisherPayments);

  const { data: publishers = [] } = useQuery({
    queryKey: ["publishers"],
    queryFn: () => listFn(),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["publisher_payments", publisherId],
    queryFn: () => listPayFn({ data: { publisher_id: publisherId } }),
  });

  const publisher = publishers.find((p: any) => p.id === publisherId);

  const [payDialog, setPayDialog] = useState<{ open: boolean; payment?: any }>({
    open: false,
  });

  const stats = useMemo(() => {
    let paid = 0,
      pending = 0;
    const paidRows = payments.filter((p: any) => p.status === "paid");
    for (const p of payments) {
      if (p.status === "paid") paid += Number(p.amount);
      else if (p.status === "pending" || p.status === "overdue")
        pending += Number(p.amount);
    }
    const lastPaid = paidRows
      .slice()
      .sort((a: any, b: any) =>
        (b.payment_date ?? "").localeCompare(a.payment_date ?? ""),
      )[0];
    return { paid, pending, lastPaid, count: payments.length };
  }, [payments]);

  if (!publisher) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="text-sm text-muted-foreground">Loading publisher…</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-8 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => nav({ to: "/publishers" })}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Publishers
            </Button>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                Publisher
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {publisher.name}
              </h1>
              <div className="text-sm text-muted-foreground mt-0.5">
                {publisher.company ?? publisher.email ?? "—"}
                <Badge variant="outline" className="ml-2 capitalize">
                  {publisher.payment_terms.replace("_", " ")}
                  {publisher.payment_terms === "custom" && publisher.custom_days
                    ? ` · ${publisher.custom_days}d`
                    : ""}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => setPayDialog({ open: true })}
          >
            <Plus className="h-4 w-4" />
            Add payment entry
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total paid" value={fmtMoney(stats.paid)} />
          <Stat
            label="Outstanding"
            value={fmtMoney(stats.pending)}
            tone="amber"
          />
          <Stat
            label="Last paid"
            value={stats.lastPaid?.payment_date ?? "—"}
            sub={stats.lastPaid ? fmtMoney(Number(stats.lastPaid.amount)) : ""}
          />
          <Stat
            label="Last billable"
            value={
              stats.lastPaid?.period_start || stats.lastPaid?.period_end
                ? `${stats.lastPaid?.period_start ?? "?"} → ${stats.lastPaid?.period_end ?? "?"}`
                : "—"
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Payment history</CardTitle>
              <div className="text-xs text-muted-foreground">
                {stats.count} entr{stats.count === 1 ? "y" : "ies"}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {payments.length === 0 && (
                  <div className="p-8 text-sm text-muted-foreground text-center">
                    No payment entries yet. Add one to start tracking.
                  </div>
                )}
                {payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${
                          p.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {p.status === "paid" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <CalendarClock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">
                          {fmtMoney(Number(p.amount))}
                          <span className="text-xs text-muted-foreground ml-2 capitalize">
                            {p.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.period_start || p.period_end
                            ? `Billable: ${p.period_start ?? "?"} → ${p.period_end ?? "?"}`
                            : ""}
                          {p.due_date ? ` · Due ${p.due_date}` : ""}
                          {p.payment_date ? ` · Paid ${p.payment_date}` : ""}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </div>
                        {p.notes && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            {p.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPayDialog({ open: true, payment: p })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {p.status !== "paid" && <MarkPaidButton id={p.id} />}
                      <DeletePayBtn id={p.id} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <NotesCard publisher={publisher} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Email" value={publisher.email ?? "—"} />
                <Row label="Phone" value={publisher.phone ?? "—"} />
                <Row label="Company" value={publisher.company ?? "—"} />
                <Row
                  label="Default amount"
                  value={
                    publisher.default_amount
                      ? fmtMoney(Number(publisher.default_amount))
                      : "—"
                  }
                />
                <Row label="Currency" value={publisher.currency} />
              </CardContent>
            </Card>
          </div>
        </div>

        <PaymentDialog
          open={payDialog.open}
          onOpenChange={(o) => setPayDialog({ ...payDialog, open: o })}
          publisher={publisher}
          payment={payDialog.payment}
        />
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "amber";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={`text-xl font-semibold mt-1 truncate ${
            tone === "amber" ? "text-amber-500" : ""
          }`}
        >
          {value}
        </div>
        {sub && (
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}

function NotesCard({ publisher }: { publisher: any }) {
  const save = useServerFn(savePublisher);
  const qc = useQueryClient();
  const [notes, setNotes] = useState(publisher.notes ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setNotes(publisher.notes ?? "");
  }, [publisher.id, publisher.notes]);

  const submit = async () => {
    setSaving(true);
    try {
      await save({
        data: {
          id: publisher.id,
          name: publisher.name,
          email: publisher.email ?? "",
          phone: publisher.phone,
          company: publisher.company,
          payment_terms: publisher.payment_terms,
          custom_days: publisher.custom_days,
          default_amount: publisher.default_amount
            ? Number(publisher.default_amount)
            : null,
          currency: publisher.currency,
          notes,
          default_business_id: publisher.default_business_id,
          default_category_id: publisher.default_category_id,
        },
      });
      toast.success("Notes saved");
      qc.invalidateQueries({ queryKey: ["publishers"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={6}
          placeholder="e.g. Last paid 2026-07-01 for June billable. Prefers weekly PayPal payouts."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          size="sm"
          className="gap-2 w-full"
          onClick={submit}
          disabled={saving}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save notes"}
        </Button>
      </CardContent>
    </Card>
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
          await fn({
            data: {
              id,
              payment_date: new Date().toISOString().slice(0, 10),
            },
          });
          toast.success("Marked paid & synced");
          qc.invalidateQueries({ queryKey: ["publisher_payments"] });
          qc.invalidateQueries({ queryKey: ["transactions"] });
        } catch (e: any) {
          toast.error(e.message ?? "Failed");
        }
      }}
    >
      <CircleDollarSign className="h-4 w-4 mr-1" />
      Mark paid
    </Button>
  );
}

function DeletePayBtn({ id }: { id: string }) {
  const fn = useServerFn(deletePayment);
  const qc = useQueryClient();
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        if (!confirm("Delete payment entry?")) return;
        await fn({ data: { id } });
        qc.invalidateQueries({ queryKey: ["publisher_payments"] });
        toast.success("Deleted");
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  publisher,
  payment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  publisher: any;
  payment?: any;
}) {
  const save = useServerFn(savePublisherPayment);
  const qc = useQueryClient();
  const [f, setF] = useState<any>({});

  useEffect(() => {
    if (!open) return;
    setF({
      amount: payment?.amount ?? publisher?.default_amount ?? "",
      currency: payment?.currency ?? publisher?.currency ?? "USD",
      period_start: payment?.period_start ?? "",
      period_end: payment?.period_end ?? "",
      due_date: payment?.due_date ?? "",
      payment_date: payment?.payment_date ?? "",
      status: payment?.status ?? "pending",
      reference: payment?.reference ?? "",
      notes: payment?.notes ?? "",
    });
  }, [open, payment, publisher]);

  const submit = async () => {
    if (!f.amount) return toast.error("Amount required");
    try {
      await save({
        data: {
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
        },
      });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["publisher_payments"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {payment ? "Edit payment" : "Add payment"} · {publisher?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount *">
            <Input
              type="number"
              step="0.01"
              value={f.amount ?? ""}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <Input
              value={f.currency ?? "USD"}
              onChange={(e) => setF({ ...f, currency: e.target.value })}
            />
          </Field>
          <Field label="Billable period start">
            <Input
              type="date"
              value={f.period_start ?? ""}
              onChange={(e) => setF({ ...f, period_start: e.target.value })}
            />
          </Field>
          <Field label="Billable period end">
            <Input
              type="date"
              value={f.period_end ?? ""}
              onChange={(e) => setF({ ...f, period_end: e.target.value })}
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={f.due_date ?? ""}
              onChange={(e) => setF({ ...f, due_date: e.target.value })}
            />
          </Field>
          <Field label="Payment date">
            <Input
              type="date"
              value={f.payment_date ?? ""}
              onChange={(e) => setF({ ...f, payment_date: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={f.status ?? "pending"}
              onValueChange={(v) => setF({ ...f, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference / invoice #">
            <Input
              value={f.reference ?? ""}
              onChange={(e) => setF({ ...f, reference: e.target.value })}
            />
          </Field>
          <Field label="Notes" className="col-span-2">
            <Textarea
              value={f.notes ?? ""}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: any;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

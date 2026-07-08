import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { listBuyers } from "@/lib/buyers.functions";
import { businessesQuery } from "@/lib/queries";
import { getInvoice, saveInvoice, sendInvoiceEmail } from "@/lib/invoices.functions";
import { getSmtpSettings } from "@/lib/smtp.functions";
import { renderInvoice, INVOICE_TEMPLATES, type InvoiceRenderData } from "@/lib/invoice-template";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  component: InvoiceEditor,
});

type Item = { id?: string; description: string; quantity: number; unit_price: number; amount: number; service_start?: string | null; service_end?: string | null };

function InvoiceEditor() {
  const { invoiceId } = Route.useParams();
  const isNew = invoiceId === "new";
  const nav = useNavigate();
  const qc = useQueryClient();

  const listBuyersFn = useServerFn(listBuyers);
  const getInvFn = useServerFn(getInvoice);
  const saveFn = useServerFn(saveInvoice);
  const sendFn = useServerFn(sendInvoiceEmail);
  const smtpFn = useServerFn(getSmtpSettings);

  const { data: buyers = [] } = useQuery({ queryKey: ["buyers"], queryFn: () => listBuyersFn() });
  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: smtp } = useQuery({ queryKey: ["smtp"], queryFn: () => smtpFn() });
  const { data: existing } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvFn({ data: { id: invoiceId } }),
    enabled: !isNew,
  });

  const [f, setF] = useState<any>({
    invoice_number: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    buyer_id: "",
    business_id: "",
    status: "draft",
    template: "classic",
    currency: "USD",
    tax_rate: 0,
    discount: 0,
    notes: "",
    terms: "Payment due within 14 days.",
    bank_details: { bank_name: "", account_name: "", account_number: "", routing: "", iban: "", swift: "", extra: "" },
    payment_link: "",
    sender: { name: "", company: "", email: "", phone: "", address: "", tax_id: "" },
    receiver: { name: "", company: "", email: "", phone: "", address: "", tax_id: "" },
  });
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  const [sendOpen, setSendOpen] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setF({
      invoice_number: existing.invoice_number,
      issue_date: existing.issue_date,
      due_date: existing.due_date ?? "",
      buyer_id: existing.buyer_id ?? "",
      business_id: existing.business_id ?? "",
      status: existing.status,
      template: existing.template,
      currency: existing.currency,
      tax_rate: existing.tax_rate,
      discount: existing.discount,
      notes: existing.notes ?? "",
      terms: existing.terms ?? "",
      bank_details: existing.bank_details ?? {},
      payment_link: existing.payment_link ?? "",
      sender: existing.sender ?? {},
      receiver: existing.receiver ?? {},
    });
    setItems(
      (existing.invoice_items ?? []).sort((a: any, b: any) => a.position - b.position).map((i: any) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        amount: Number(i.amount),
        service_start: i.service_start,
        service_end: i.service_end,
      })) || [],
    );
  }, [existing]);

  const buyer = buyers.find((b: any) => b.id === f.buyer_id);
  useEffect(() => {
    if (!buyer) return;
    setF((prev: any) => ({
      ...prev,
      receiver: {
        name: buyer.name,
        company: buyer.company ?? "",
        email: buyer.email ?? "",
        phone: buyer.phone ?? "",
        address: buyer.address ?? "",
        tax_id: buyer.tax_id ?? "",
      },
      currency: buyer.currency ?? prev.currency,
    }));
  }, [f.buyer_id]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
    const taxable = Math.max(0, subtotal - Number(f.discount || 0));
    const tax_amount = +(taxable * (Number(f.tax_rate || 0) / 100)).toFixed(2);
    const total = +(taxable + tax_amount).toFixed(2);
    return { subtotal, tax_amount, total };
  }, [items, f.tax_rate, f.discount]);

  const renderData: InvoiceRenderData = {
    invoice_number: f.invoice_number,
    issue_date: f.issue_date,
    due_date: f.due_date,
    currency: f.currency,
    items: items.map((i) => ({ ...i, amount: Number(i.quantity) * Number(i.unit_price) })),
    subtotal: totals.subtotal,
    discount: Number(f.discount || 0),
    tax_rate: Number(f.tax_rate || 0),
    tax_amount: totals.tax_amount,
    total: totals.total,
    notes: f.notes,
    terms: f.terms,
    bank_details: f.bank_details,
    payment_link: f.payment_link,
    sender: f.sender,
    receiver: f.receiver,
  };
  const previewHtml = renderInvoice(renderData, f.template);

  const save = async () => {
    if (!f.invoice_number.trim()) return toast.error("Invoice # required");
    if (items.length === 0 || items.some((i) => !i.description.trim())) return toast.error("All items need a description");
    try {
      const r = await saveFn({ data: {
        id: isNew ? undefined : invoiceId,
        buyer_id: f.buyer_id || null,
        business_id: f.business_id || null,
        invoice_number: f.invoice_number,
        issue_date: f.issue_date,
        due_date: f.due_date || null,
        status: f.status,
        template: f.template,
        currency: f.currency,
        tax_rate: Number(f.tax_rate || 0),
        discount: Number(f.discount || 0),
        notes: f.notes || null,
        terms: f.terms || null,
        bank_details: f.bank_details,
        payment_link: f.payment_link || null,
        sender: f.sender,
        receiver: f.receiver,
        items: items.map((i, idx) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          amount: Number(i.quantity) * Number(i.unit_price),
          service_start: i.service_start || null,
          service_end: i.service_end || null,
          position: idx,
        })),
      }});
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      if (isNew) nav({ to: "/invoices/$invoiceId", params: { invoiceId: r.id } });
      return r.id;
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Invoicing</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{isNew ? "New invoice" : `Invoice ${f.invoice_number}`}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => nav({ to: "/invoices" })}>Back</Button>
            <Button variant="outline" className="gap-2" onClick={save}><Save className="h-4 w-4" />Save</Button>
            <Button
              className="gap-2"
              onClick={async () => {
                if (!smtp) return toast.error("Configure SMTP in Settings first");
                if (!f.receiver?.email) return toast.error("Buyer needs an email");
                const id = isNew ? await save() : invoiceId;
                if (id) setSendOpen(true);
              }}
            ><Send className="h-4 w-4" />Send</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Field label="Invoice #"><Input value={f.invoice_number} onChange={(e) => setF({ ...f, invoice_number: e.target.value })} /></Field>
                <Field label="Status">
                  <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["draft", "sent", "paid", "overdue", "cancelled"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Issue date"><Input type="date" value={f.issue_date} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></Field>
                <Field label="Due date"><Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
                <Field label="Buyer">
                  <Select value={f.buyer_id || "none"} onValueChange={(v) => setF({ ...f, buyer_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— none —</SelectItem>
                      {buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Entity (for sync)">
                  <Select value={f.business_id || "none"} onValueChange={(v) => setF({ ...f, business_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— none —</SelectItem>
                      {businesses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Currency"><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field>
                <Field label="Template">
                  <Select value={f.template} onValueChange={(v) => setF({ ...f, template: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INVOICE_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">From (your details)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Field label="Name"><Input value={f.sender.name ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, name: e.target.value } })} /></Field>
                <Field label="Company"><Input value={f.sender.company ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, company: e.target.value } })} /></Field>
                <Field label="Email"><Input value={f.sender.email ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, email: e.target.value } })} /></Field>
                <Field label="Phone"><Input value={f.sender.phone ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, phone: e.target.value } })} /></Field>
                <Field label="Address" className="col-span-2"><Textarea value={f.sender.address ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, address: e.target.value } })} /></Field>
                <Field label="Tax ID"><Input value={f.sender.tax_id ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, tax_id: e.target.value } })} /></Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Line items</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0 }])}><Plus className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
                    <div className="col-span-12">
                      <Label className="text-xs">Description</Label>
                      <Input value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                    </div>
                    <div className="col-span-3"><Label className="text-xs">Qty</Label><Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} /></div>
                    <div className="col-span-3"><Label className="text-xs">Rate</Label><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} /></div>
                    <div className="col-span-3"><Label className="text-xs">Period start</Label><Input type="date" value={it.service_start ?? ""} onChange={(e) => updateItem(idx, "service_start", e.target.value)} /></div>
                    <div className="col-span-3"><Label className="text-xs">Period end</Label><Input type="date" value={it.service_end ?? ""} onChange={(e) => updateItem(idx, "service_end", e.target.value)} /></div>
                    <div className="col-span-11 text-right text-sm">{fmtMoney(Number(it.quantity) * Number(it.unit_price))}</div>
                    <div className="col-span-1 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Field label="Discount"><Input type="number" step="0.01" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></Field>
                  <Field label="Tax %"><Input type="number" step="0.01" value={f.tax_rate} onChange={(e) => setF({ ...f, tax_rate: e.target.value })} /></Field>
                </div>
                <div className="text-right space-y-1 text-sm">
                  <div>Subtotal: <b>{fmtMoney(totals.subtotal)}</b></div>
                  <div>Tax: <b>{fmtMoney(totals.tax_amount)}</b></div>
                  <div className="text-lg">Total: <b className="text-primary">{fmtMoney(totals.total)}</b></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Bank / payment details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Field label="Bank name"><Input value={f.bank_details.bank_name ?? ""} onChange={(e) => setF({ ...f, bank_details: { ...f.bank_details, bank_name: e.target.value } })} /></Field>
                <Field label="Account name"><Input value={f.bank_details.account_name ?? ""} onChange={(e) => setF({ ...f, bank_details: { ...f.bank_details, account_name: e.target.value } })} /></Field>
                <Field label="Account #"><Input value={f.bank_details.account_number ?? ""} onChange={(e) => setF({ ...f, bank_details: { ...f.bank_details, account_number: e.target.value } })} /></Field>
                <Field label="Routing"><Input value={f.bank_details.routing ?? ""} onChange={(e) => setF({ ...f, bank_details: { ...f.bank_details, routing: e.target.value } })} /></Field>
                <Field label="IBAN"><Input value={f.bank_details.iban ?? ""} onChange={(e) => setF({ ...f, bank_details: { ...f.bank_details, iban: e.target.value } })} /></Field>
                <Field label="SWIFT"><Input value={f.bank_details.swift ?? ""} onChange={(e) => setF({ ...f, bank_details: { ...f.bank_details, swift: e.target.value } })} /></Field>
                <Field label="Payment link (Stripe, PayPal, etc.)" className="col-span-2"><Input value={f.payment_link ?? ""} onChange={(e) => setF({ ...f, payment_link: e.target.value })} placeholder="https://..." /></Field>
                <Field label="Extra payment notes" className="col-span-2"><Textarea value={f.bank_details.extra ?? ""} onChange={(e) => setF({ ...f, bank_details: { ...f.bank_details, extra: e.target.value } })} /></Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Notes & terms</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Notes"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
                <Field label="Terms"><Textarea value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} /></Field>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader><CardTitle className="text-base">Preview · {INVOICE_TEMPLATES.find((t) => t.id === f.template)?.label}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <iframe title="preview" srcDoc={previewHtml} className="w-full h-[900px] border-0" />
              </CardContent>
            </Card>
          </div>
        </div>

        <SendDialog
          open={sendOpen}
          onOpenChange={setSendOpen}
          invoiceId={isNew ? "" : invoiceId}
          defaultTo={f.receiver?.email ?? ""}
          defaultSubject={`Invoice ${f.invoice_number} from ${f.sender?.company || f.sender?.name || "us"}`}
          html={previewHtml}
        />
      </div>
    </AppShell>
  );

  function updateItem<K extends keyof Item>(idx: number, key: K, val: Item[K]) {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    setItems(next);
  }
}

function Field({ label, children, className = "" }: any) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SendDialog({ open, onOpenChange, invoiceId, defaultTo, defaultSubject, html }: any) {
  const sendFn = useServerFn(sendInvoiceEmail);
  const qc = useQueryClient();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("Please find the attached invoice details below. Thanks!");
  const [sending, setSending] = useState(false);
  useEffect(() => { if (open) { setTo(defaultTo); setSubject(defaultSubject); } }, [open, defaultTo, defaultSubject]);

  const send = async () => {
    setSending(true);
    try {
      const r = await sendFn({ data: { id: invoiceId, to, subject, message, html } });
      if (r.ok) {
        toast.success("Invoice sent");
        qc.invalidateQueries({ queryKey: ["invoices"] });
        onOpenChange(false);
      } else {
        toast.error(r.error ?? "Failed");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send invoice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <Field label="Message"><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending}>{sending ? "Sending…" : "Send"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

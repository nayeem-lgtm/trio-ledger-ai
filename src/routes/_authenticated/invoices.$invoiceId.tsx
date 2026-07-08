import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Save, Send, Sparkles } from "lucide-react";
import { listBuyers } from "@/lib/buyers.functions";
import { businessesQuery } from "@/lib/queries";
import { getInvoice, saveInvoice, sendInvoiceEmail } from "@/lib/invoices.functions";
import { getSmtpSettings } from "@/lib/smtp.functions";
import { getBrandKit } from "@/lib/brand-kit.functions";
import { renderInvoice, INVOICE_TEMPLATES, DEFAULT_BLOCKS, type InvoiceRenderData } from "@/lib/invoice-template";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  component: InvoiceEditor,
});

type Item = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  service_start?: string | null;
  service_end?: string | null;
  item_tax_rate?: number;
  item_discount?: number;
};

type CustomField = { label: string; value: string };

function tpl(str: string | null | undefined, vars: Record<string, string>) {
  if (!str) return str ?? "";
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function InvoiceEditor() {
  const { invoiceId } = Route.useParams();
  const isNew = invoiceId === "new";
  const nav = useNavigate();
  const qc = useQueryClient();

  const listBuyersFn = useServerFn(listBuyers);
  const getInvFn = useServerFn(getInvoice);
  const saveFn = useServerFn(saveInvoice);
  const smtpFn = useServerFn(getSmtpSettings);
  const brandFn = useServerFn(getBrandKit);

  const { data: buyers = [] } = useQuery({ queryKey: ["buyers"], queryFn: () => listBuyersFn() });
  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: smtp } = useQuery({ queryKey: ["smtp"], queryFn: () => smtpFn() });
  const { data: brand } = useQuery({ queryKey: ["brand-kit"], queryFn: () => brandFn() });
  const { data: existing } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvFn({ data: { id: invoiceId } }),
    enabled: !isNew,
  });

  const [f, setF] = useState<any>({
    invoice_number: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    po_number: "",
    project_code: "",
    buyer_id: "",
    business_id: "",
    status: "draft",
    template: "modern",
    currency: "USD",
    tax_rate: 0,
    discount: 0,
    notes: "",
    terms: "Payment due within 14 days.",
    bank_details: { bank_name: "", account_name: "", account_number: "", routing: "", iban: "", swift: "", extra: "" },
    payment_link: "",
    sender: { name: "", company: "", email: "", phone: "", address: "", tax_id: "", website: "" },
    receiver: { name: "", company: "", email: "", phone: "", address: "", tax_id: "" },
    cc_emails: [] as string[],
    bcc_emails: [] as string[],
    email_subject: "",
    email_body: "",
  });
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0, amount: 0, item_tax_rate: 0, item_discount: 0 }]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [blocks, setBlocks] = useState({ ...DEFAULT_BLOCKS });
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [brandApplied, setBrandApplied] = useState(false);

  // apply brand-kit defaults on new invoices
  useEffect(() => {
    if (!isNew || !brand || brandApplied) return;
    setF((prev: any) => ({
      ...prev,
      sender: {
        name: brand.company_name ?? prev.sender.name,
        company: brand.company_name ?? "",
        email: brand.company_email ?? "",
        phone: brand.company_phone ?? "",
        address: brand.company_address ?? "",
        tax_id: brand.company_tax_id ?? "",
        website: brand.company_website ?? "",
      },
      terms: brand.default_terms ?? prev.terms,
      notes: brand.default_notes ?? prev.notes,
      email_subject: brand.default_email_subject ?? prev.email_subject,
      email_body: brand.default_email_body ?? prev.email_body,
    }));
    setBlocks((b) => ({
      ...b,
      show_logo: !!brand.logo_url,
      show_signature: !!brand.signature_url,
      show_watermark: !!brand.watermark_text,
      show_footer: !!brand.footer_text,
    }));
    setBrandApplied(true);
  }, [brand, isNew, brandApplied]);

  useEffect(() => {
    if (!existing) return;
    setF({
      invoice_number: existing.invoice_number,
      issue_date: existing.issue_date,
      due_date: existing.due_date ?? "",
      po_number: (existing as any).po_number ?? "",
      project_code: (existing as any).project_code ?? "",
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
      cc_emails: (existing as any).cc_emails ?? [],
      bcc_emails: (existing as any).bcc_emails ?? [],
      email_subject: (existing as any).email_subject ?? "",
      email_body: (existing as any).email_body ?? "",
    });
    setItems(
      (existing.invoice_items ?? [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((i: any) => ({
          id: i.id,
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          amount: Number(i.amount),
          service_start: i.service_start,
          service_end: i.service_end,
          item_tax_rate: Number(i.item_tax_rate ?? 0),
          item_discount: Number(i.item_discount ?? 0),
        })) || [],
    );
    setCustomFields(((existing as any).custom_fields as CustomField[]) ?? []);
    const b = (existing as any).blocks ?? {};
    if (b && Object.keys(b).length) setBlocks({ ...DEFAULT_BLOCKS, ...b });
  }, [existing]);

  // sync buyer -> receiver
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
    let subtotal = 0;
    let line_tax = 0;
    for (const i of items) {
      const line = Number(i.quantity || 0) * Number(i.unit_price || 0);
      const ld = Number(i.item_discount ?? 0);
      subtotal += line;
      line_tax += Math.max(0, line - ld) * (Number(i.item_tax_rate ?? 0) / 100);
    }
    const taxable = Math.max(0, subtotal - Number(f.discount || 0));
    const global_tax = +(taxable * (Number(f.tax_rate || 0) / 100)).toFixed(2);
    const tax_amount = +(global_tax + line_tax).toFixed(2);
    const total = +(taxable + tax_amount).toFixed(2);
    return { subtotal, tax_amount, total };
  }, [items, f.tax_rate, f.discount]);

  const renderData: InvoiceRenderData = {
    invoice_number: f.invoice_number,
    issue_date: f.issue_date,
    due_date: f.due_date,
    po_number: f.po_number,
    project_code: f.project_code,
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
    custom_fields: customFields,
    brand: brand ?? undefined,
    blocks,
  };
  const previewHtml = renderInvoice(renderData, f.template);

  const save = async () => {
    if (!f.invoice_number.trim()) return toast.error("Invoice # required");
    if (items.length === 0 || items.some((i) => !i.description.trim())) return toast.error("All items need a description");
    try {
      const r = await saveFn({
        data: {
          id: isNew ? undefined : invoiceId,
          brand_kit_id: brand?.id ?? null,
          buyer_id: f.buyer_id || null,
          business_id: f.business_id || null,
          invoice_number: f.invoice_number,
          issue_date: f.issue_date,
          due_date: f.due_date || null,
          po_number: f.po_number || null,
          project_code: f.project_code || null,
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
          custom_fields: customFields.filter((c) => c.label || c.value),
          blocks,
          cc_emails: f.cc_emails,
          bcc_emails: f.bcc_emails,
          email_subject: f.email_subject || null,
          email_body: f.email_body || null,
          items: items.map((i, idx) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
            amount: Number(i.quantity) * Number(i.unit_price),
            service_start: i.service_start || null,
            service_end: i.service_end || null,
            item_tax_rate: Number(i.item_tax_rate ?? 0),
            item_discount: Number(i.item_discount ?? 0),
            position: idx,
          })),
        },
      });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      if (isNew) nav({ to: "/invoices/$invoiceId", params: { invoiceId: r.id } });
      return r.id;
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addCcEmail = () => {
    const v = ccInput.trim();
    if (!v) return;
    setF((p: any) => ({ ...p, cc_emails: [...p.cc_emails, v] }));
    setCcInput("");
  };
  const addBccEmail = () => {
    const v = bccInput.trim();
    if (!v) return;
    setF((p: any) => ({ ...p, bcc_emails: [...p.bcc_emails, v] }));
    setBccInput("");
  };

  const emailVars = {
    invoice_number: f.invoice_number,
    company_name: brand?.company_name ?? f.sender?.company ?? f.sender?.name ?? "",
    buyer_name: f.receiver?.name ?? "",
    total: fmtMoney(totals.total),
    due_date: f.due_date ?? "",
  };
  const emailSubject = tpl(f.email_subject || brand?.default_email_subject || `Invoice ${f.invoice_number}`, emailVars);
  const emailBody = tpl(f.email_body || brand?.default_email_body || "Please find your invoice below. Thanks!", emailVars);

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Invoicing</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{isNew ? "New invoice" : `Invoice ${f.invoice_number}`}</h1>
            {!brand && (
              <p className="text-xs text-amber-500 mt-1 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Set up your <a className="underline" href="/brand">Brand Kit</a> for logo, colors and defaults.
              </p>
            )}
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
                <Field label="PO #"><Input value={f.po_number} onChange={(e) => setF({ ...f, po_number: e.target.value })} placeholder="Optional" /></Field>
                <Field label="Project code"><Input value={f.project_code} onChange={(e) => setF({ ...f, project_code: e.target.value })} placeholder="Optional" /></Field>
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
              <CardHeader>
                <CardTitle className="text-base">Layout & blocks</CardTitle>
                <CardDescription>Toggle sections and adjust header alignment. Colors, logo & fonts come from your Brand Kit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["show_logo", "Logo"], ["show_tagline", "Tagline"], ["show_signature", "Signature"],
                    ["show_watermark", "Watermark"], ["show_bank", "Bank / payment details"],
                    ["show_notes", "Notes"], ["show_terms", "Terms"], ["show_footer", "Footer line"],
                    ["show_custom_fields", "Custom fields"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between text-sm p-2 rounded border border-border">
                      <span>{label}</span>
                      <Switch checked={(blocks as any)[key]} onCheckedChange={(v) => setBlocks((b) => ({ ...b, [key]: v }))} />
                    </label>
                  ))}
                </div>
                <Field label="Header alignment">
                  <Select value={blocks.header_align} onValueChange={(v: any) => setBlocks({ ...blocks, header_align: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Custom fields</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setCustomFields([...customFields, { label: "", value: "" }])}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {customFields.length === 0 && <p className="text-xs text-muted-foreground">No custom fields. Add things like "PO #", "Client contact", "Contract ID".</p>}
                {customFields.map((cf, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Input placeholder="Label" className="col-span-4" value={cf.label} onChange={(e) => {
                      const next = [...customFields]; next[idx] = { ...next[idx], label: e.target.value }; setCustomFields(next);
                    }} />
                    <Input placeholder="Value" className="col-span-7" value={cf.value} onChange={(e) => {
                      const next = [...customFields]; next[idx] = { ...next[idx], value: e.target.value }; setCustomFields(next);
                    }} />
                    <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">From (override Brand Kit for this invoice)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Field label="Name"><Input value={f.sender.name ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, name: e.target.value } })} /></Field>
                <Field label="Company"><Input value={f.sender.company ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, company: e.target.value } })} /></Field>
                <Field label="Email"><Input value={f.sender.email ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, email: e.target.value } })} /></Field>
                <Field label="Phone"><Input value={f.sender.phone ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, phone: e.target.value } })} /></Field>
                <Field label="Address" className="col-span-2"><Textarea value={f.sender.address ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, address: e.target.value } })} /></Field>
                <Field label="Tax ID"><Input value={f.sender.tax_id ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, tax_id: e.target.value } })} /></Field>
                <Field label="Website"><Input value={f.sender.website ?? ""} onChange={(e) => setF({ ...f, sender: { ...f.sender, website: e.target.value } })} /></Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Line items</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0, item_tax_rate: 0, item_discount: 0 }])}><Plus className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
                    <div className="col-span-12">
                      <Label className="text-xs">Description</Label>
                      <Input value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                    </div>
                    <div className="col-span-2"><Label className="text-xs">Qty</Label><Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Rate</Label><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Disc</Label><Input type="number" step="0.01" value={it.item_discount ?? 0} onChange={(e) => updateItem(idx, "item_discount", Number(e.target.value))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Tax %</Label><Input type="number" step="0.01" value={it.item_tax_rate ?? 0} onChange={(e) => updateItem(idx, "item_tax_rate", Number(e.target.value))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Start</Label><Input type="date" value={it.service_start ?? ""} onChange={(e) => updateItem(idx, "service_start", e.target.value)} /></div>
                    <div className="col-span-2"><Label className="text-xs">End</Label><Input type="date" value={it.service_end ?? ""} onChange={(e) => updateItem(idx, "service_end", e.target.value)} /></div>
                    <div className="col-span-11 text-right text-sm">{fmtMoney(Number(it.quantity) * Number(it.unit_price))}</div>
                    <div className="col-span-1 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Field label="Global discount"><Input type="number" step="0.01" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></Field>
                  <Field label="Global tax %"><Input type="number" step="0.01" value={f.tax_rate} onChange={(e) => setF({ ...f, tax_rate: e.target.value })} /></Field>
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
                <Field label="Payment link (Stripe / PayPal / etc.)" className="col-span-2"><Input value={f.payment_link ?? ""} onChange={(e) => setF({ ...f, payment_link: e.target.value })} placeholder="https://..." /></Field>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email delivery</CardTitle>
                <CardDescription>Overrides the Brand Kit defaults for just this invoice.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CC recipients" className="col-span-1">
                    <div className="flex gap-2">
                      <Input value={ccInput} onChange={(e) => setCcInput(e.target.value)} placeholder="add@company.com" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCcEmail())} />
                      <Button variant="outline" size="sm" onClick={addCcEmail}>Add</Button>
                    </div>
                    <EmailChips list={f.cc_emails} onRemove={(i) => setF({ ...f, cc_emails: f.cc_emails.filter((_: string, k: number) => k !== i) })} />
                  </Field>
                  <Field label="BCC recipients" className="col-span-1">
                    <div className="flex gap-2">
                      <Input value={bccInput} onChange={(e) => setBccInput(e.target.value)} placeholder="cc@company.com" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBccEmail())} />
                      <Button variant="outline" size="sm" onClick={addBccEmail}>Add</Button>
                    </div>
                    <EmailChips list={f.bcc_emails} onRemove={(i) => setF({ ...f, bcc_emails: f.bcc_emails.filter((_: string, k: number) => k !== i) })} />
                  </Field>
                </div>
                <Field label="Email subject (supports {{invoice_number}}, {{company_name}}, {{buyer_name}}, {{total}}, {{due_date}})">
                  <Input value={f.email_subject ?? ""} onChange={(e) => setF({ ...f, email_subject: e.target.value })} placeholder="Invoice {{invoice_number}} from {{company_name}}" />
                </Field>
                <Field label="Email body">
                  <Textarea rows={4} value={f.email_body ?? ""} onChange={(e) => setF({ ...f, email_body: e.target.value })} placeholder="Hi {{buyer_name}}, please find your invoice below…" />
                </Field>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview · {INVOICE_TEMPLATES.find((t) => t.id === f.template)?.label}</CardTitle>
                <CardDescription>Live render including brand kit, blocks and custom fields.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <iframe title="preview" srcDoc={previewHtml} className="w-full h-[1100px] border-0" />
              </CardContent>
            </Card>
          </div>
        </div>

        <SendDialog
          open={sendOpen}
          onOpenChange={setSendOpen}
          invoiceId={isNew ? "" : invoiceId}
          defaultTo={f.receiver?.email ?? ""}
          defaultCc={f.cc_emails}
          defaultBcc={f.bcc_emails}
          defaultSubject={emailSubject}
          defaultBody={emailBody}
          html={previewHtml}
          embedAssets={[brand?.logo_url, brand?.signature_url].filter((x): x is string => !!x)}
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

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function EmailChips({ list, onRemove }: { list: string[]; onRemove: (idx: number) => void }) {
  if (!list?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {list.map((e, i) => (
        <button key={i} onClick={() => onRemove(i)} className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-destructive/20 flex items-center gap-1">
          {e} <Trash2 className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

function SendDialog({ open, onOpenChange, invoiceId, defaultTo, defaultCc, defaultBcc, defaultSubject, defaultBody, html, embedAssets }: any) {
  const sendFn = useServerFn(sendInvoiceEmail);
  const qc = useQueryClient();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (open) { setTo(defaultTo); setSubject(defaultSubject); setMessage(defaultBody); }
  }, [open, defaultTo, defaultSubject, defaultBody]);

  const send = async () => {
    setSending(true);
    try {
      const r = await sendFn({ data: { id: invoiceId, to, cc: defaultCc, bcc: defaultBcc, subject, message, html, embed_assets: embedAssets } });
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Send invoice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          {defaultCc?.length ? <div className="text-xs text-muted-foreground">CC: {defaultCc.join(", ")}</div> : null}
          {defaultBcc?.length ? <div className="text-xs text-muted-foreground">BCC: {defaultBcc.join(", ")}</div> : null}
          <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <Field label="Message"><Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending}>{sending ? "Sending…" : "Send"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

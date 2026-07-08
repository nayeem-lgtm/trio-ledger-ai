import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative(),
  unit_price: z.number().nonnegative(),
  amount: z.number().nonnegative(),
  service_start: z.string().optional().nullable(),
  service_end: z.string().optional().nullable(),
  position: z.number().int().nonnegative().default(0),
});

const InvoiceSchema = z.object({
  id: z.string().uuid().optional(),
  buyer_id: z.string().uuid().optional().nullable(),
  business_id: z.string().uuid().optional().nullable(),
  invoice_number: z.string().min(1).max(80),
  issue_date: z.string(),
  due_date: z.string().optional().nullable(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  template: z.string().max(40).default("classic"),
  currency: z.string().max(8).default("USD"),
  tax_rate: z.number().nonnegative().max(100).default(0),
  discount: z.number().nonnegative().default(0),
  notes: z.string().max(4000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
  bank_details: z.record(z.string(), z.any()).optional().nullable(),
  payment_link: z.string().url().max(500).optional().nullable().or(z.literal("")),
  sender: z.record(z.string(), z.any()).optional().nullable(),
  receiver: z.record(z.string(), z.any()).optional().nullable(),
  items: z.array(ItemSchema).min(1),
});

function computeTotals(items: { quantity: number; unit_price: number }[], tax_rate: number, discount: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax_amount = +(taxable * (tax_rate / 100)).toFixed(2);
  const total = +(taxable + tax_amount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), tax_amount, total };
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("invoices")
      .select("*, buyers(name, email, company)")
      .order("issue_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("invoices")
      .select("*, buyers(name, email, phone, company, address, tax_id, currency), invoice_items(*)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return inv;
  });

export const saveInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InvoiceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const totals = computeTotals(data.items, data.tax_rate, data.discount);
    const invoicePayload: any = {
      user_id: userId,
      buyer_id: data.buyer_id || null,
      business_id: data.business_id || null,
      invoice_number: data.invoice_number,
      issue_date: data.issue_date,
      due_date: data.due_date || null,
      status: data.status,
      template: data.template,
      currency: data.currency,
      tax_rate: data.tax_rate,
      discount: data.discount,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total,
      notes: data.notes,
      terms: data.terms,
      bank_details: data.bank_details ?? {},
      payment_link: data.payment_link || null,
      sender: data.sender ?? {},
      receiver: data.receiver ?? {},
    };

    let invoiceId = data.id;
    if (invoiceId) {
      const { error } = await supabase.from("invoices").update(invoicePayload).eq("id", invoiceId);
      if (error) throw error;
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
    } else {
      const { data: row, error } = await supabase.from("invoices").insert(invoicePayload).select("id").single();
      if (error) throw error;
      invoiceId = row.id;
    }
    const itemsPayload = data.items.map((it, idx) => ({
      invoice_id: invoiceId,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      amount: +(it.quantity * it.unit_price).toFixed(2),
      service_start: it.service_start || null,
      service_end: it.service_end || null,
      position: idx,
    }));
    const { error: e2 } = await supabase.from("invoice_items").insert(itemsPayload);
    if (e2) throw e2;
    return { id: invoiceId };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("invoices").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const markInvoicePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), paid_date: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inv, error } = await supabase
      .from("invoices")
      .select("*, buyers(name, default_business_id, default_category_id)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    let transaction_id: string | null = inv.transaction_id;
    const businessId = inv.business_id ?? inv.buyers?.default_business_id;
    if (!transaction_id && businessId) {
      const { data: tx, error: e2 } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          business_id: businessId,
          category_id: inv.buyers?.default_category_id ?? null,
          type: "income",
          amount: inv.total,
          vendor: inv.buyers?.name ?? inv.invoice_number,
          description: `Invoice ${inv.invoice_number}`,
          transaction_date: data.paid_date ?? new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (e2) throw e2;
      transaction_id = tx.id;
    }
    const { error: e3 } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        transaction_id,
      })
      .eq("id", data.id);
    if (e3) throw e3;
    return { ok: true };
  });

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      to: z.string().email(),
      subject: z.string().min(1).max(300),
      message: z.string().max(4000).optional(),
      html: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s, error: e1 } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (e1) throw e1;
    if (!s) throw new Error("SMTP not configured. Add SMTP settings first.");
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      auth: { user: s.username, pass: s.password },
    });
    try {
      const info = await transport.sendMail({
        from: s.from_name ? `${s.from_name} <${s.from_email}>` : s.from_email,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.message,
        replyTo: s.reply_to || undefined,
      });
      await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", data.id)
        .in("status", ["draft", "overdue"]);
      return { ok: true, messageId: info.messageId };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Send failed" };
    }
  });

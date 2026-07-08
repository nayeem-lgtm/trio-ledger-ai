import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PublisherSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  payment_terms: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "custom", "on_receipt"]),
  custom_days: z.number().int().positive().max(365).optional().nullable(),
  default_amount: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1).max(8).default("USD"),
  bank_details: z.record(z.string(), z.any()).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  default_business_id: z.string().uuid().optional().nullable(),
  default_category_id: z.string().uuid().optional().nullable(),
});

export const listPublishers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("publishers")
      .select("*, publisher_payments(id, amount, status, payment_date, due_date, period_end)")
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const savePublisher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PublisherSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: any = { ...data, user_id: userId };
    if (payload.email === "") payload.email = null;
    if (data.id) {
      const { error } = await supabase.from("publishers").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    delete payload.id;
    const { data: row, error } = await supabase.from("publishers").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const deletePublisher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("publishers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const PaymentSchema = z.object({
  id: z.string().uuid().optional(),
  publisher_id: z.string().uuid(),
  amount: z.number().nonnegative(),
  currency: z.string().max(8).default("USD"),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  payment_date: z.string().optional().nullable(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const savePublisherPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PaymentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: any = { ...data, user_id: userId };
    if (data.id) {
      const { error } = await supabase.from("publisher_payments").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    delete payload.id;
    const { data: row, error } = await supabase.from("publisher_payments").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const listPublisherPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ publisher_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("publisher_payments")
      .select("*, publishers(name, currency, default_business_id, default_category_id)")
      .order("payment_date", { ascending: false, nullsFirst: false })
      .order("due_date", { ascending: false, nullsFirst: false });
    if (data.publisher_id) q = q.eq("publisher_id", data.publisher_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const markPaymentPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      payment_date: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pay, error: e1 } = await supabase
      .from("publisher_payments")
      .select("*, publishers(name, default_business_id, default_category_id)")
      .eq("id", data.id)
      .single();
    if (e1) throw e1;

    let transaction_id: string | null = pay.transaction_id;
    const businessId = pay.publishers?.default_business_id;
    if (!transaction_id && businessId) {
      const { data: tx, error: e2 } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          business_id: businessId,
          category_id: pay.publishers?.default_category_id ?? null,
          type: "expense",
          amount: pay.amount,
          vendor: pay.publishers?.name ?? "Publisher payment",
          description: pay.reference ?? `Publisher payment ${pay.period_start ?? ""}${pay.period_end ? "→" + pay.period_end : ""}`,
          transaction_date: data.payment_date ?? new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (e2) throw e2;
      transaction_id = tx.id;
    }
    const { error: e3 } = await supabase
      .from("publisher_payments")
      .update({ status: "paid", payment_date: data.payment_date ?? new Date().toISOString().slice(0, 10), transaction_id })
      .eq("id", data.id);
    if (e3) throw e3;
    return { ok: true, transaction_id };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("publisher_payments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

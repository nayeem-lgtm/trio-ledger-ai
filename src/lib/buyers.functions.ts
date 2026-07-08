import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BuyerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  tax_id: z.string().max(80).optional().nullable(),
  payment_terms: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "custom", "on_receipt"]),
  custom_days: z.number().int().positive().max(365).optional().nullable(),
  currency: z.string().max(8).default("USD"),
  notes: z.string().max(2000).optional().nullable(),
  default_business_id: z.string().uuid().optional().nullable(),
  default_category_id: z.string().uuid().optional().nullable(),
});

export const listBuyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("buyers")
      .select("*, buyer_receipts(id, amount, status, received_date, expected_date)")
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const saveBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BuyerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: any = { ...data, user_id: userId };
    if (payload.email === "") payload.email = null;
    if (data.id) {
      const { error } = await supabase.from("buyers").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    delete payload.id;
    const { data: row, error } = await supabase.from("buyers").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("buyers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const ReceiptSchema = z.object({
  id: z.string().uuid().optional(),
  buyer_id: z.string().uuid(),
  amount: z.number().nonnegative(),
  currency: z.string().max(8).default("USD"),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  expected_date: z.string().optional().nullable(),
  received_date: z.string().optional().nullable(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const saveBuyerReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReceiptSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: any = { ...data, user_id: userId };
    if (data.id) {
      const { error } = await supabase.from("buyer_receipts").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    delete payload.id;
    const { data: row, error } = await supabase.from("buyer_receipts").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const listBuyerReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ buyer_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("buyer_receipts")
      .select("*, buyers(name, currency, default_business_id, default_category_id)")
      .order("received_date", { ascending: false, nullsFirst: false })
      .order("expected_date", { ascending: false, nullsFirst: false });
    if (data.buyer_id) q = q.eq("buyer_id", data.buyer_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const markReceiptReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), received_date: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rec, error: e1 } = await supabase
      .from("buyer_receipts")
      .select("*, buyers(name, default_business_id, default_category_id)")
      .eq("id", data.id)
      .single();
    if (e1) throw e1;

    let transaction_id: string | null = rec.transaction_id;
    const businessId = rec.buyers?.default_business_id;
    if (!transaction_id && businessId) {
      const { data: tx, error: e2 } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          business_id: businessId,
          category_id: rec.buyers?.default_category_id ?? null,
          type: "income",
          amount: rec.amount,
          vendor: rec.buyers?.name ?? "Buyer receipt",
          description: rec.reference ?? `Buyer receipt ${rec.period_start ?? ""}${rec.period_end ? "→" + rec.period_end : ""}`,
          transaction_date: data.received_date ?? new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (e2) throw e2;
      transaction_id = tx.id;
    }
    const { error: e3 } = await supabase
      .from("buyer_receipts")
      .update({ status: "paid", received_date: data.received_date ?? new Date().toISOString().slice(0, 10), transaction_id })
      .eq("id", data.id);
    if (e3) throw e3;
    return { ok: true };
  });

export const deleteReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("buyer_receipts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

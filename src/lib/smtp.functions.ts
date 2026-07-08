import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_email: string;
  from_name: string | null;
  reply_to: string | null;
  has_password: boolean;
  password_masked: string | null;
};

const mask = (s: string | null | undefined) => (s ? "•".repeat(Math.min(s.length, 8)) : null);

export const getSmtpSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SmtpSettings | null> => {
    const { data, error } = await context.supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      from_email: data.from_email,
      from_name: data.from_name,
      reply_to: data.reply_to,
      has_password: !!data.password,
      password_masked: mask(data.password),
    };
  });

const SaveSchema = z.object({
  host: z.string().min(1).max(200),
  port: z.number().int().positive().max(65535),
  secure: z.boolean(),
  username: z.string().min(1).max(200),
  password: z.string().max(500).optional().nullable(),
  from_email: z.string().email().max(200),
  from_name: z.string().max(200).optional().nullable(),
  reply_to: z.string().email().max(200).optional().nullable().or(z.literal("")),
});

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("smtp_settings")
      .select("password")
      .eq("user_id", userId)
      .maybeSingle();
    const password = data.password && data.password.length > 0 ? data.password : existing?.password;
    if (!password) throw new Error("Password is required for new SMTP setup");
    const payload: any = {
      user_id: userId,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      password,
      from_email: data.from_email,
      from_name: data.from_name || null,
      reply_to: data.reply_to || null,
    };
    const { error } = await supabase.from("smtp_settings").upsert(payload);
    if (error) throw error;
    return { ok: true };
  });

export const deleteSmtpSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("smtp_settings")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const testSmtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ to: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s, error } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!s) throw new Error("SMTP not configured");
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
        subject: "Cashflow SMTP test",
        text: "This is a test message from Cashflow. SMTP is configured correctly.",
        html: "<p>This is a test message from <b>Cashflow</b>. SMTP is configured correctly.</p>",
        replyTo: s.reply_to || undefined,
      });
      return { ok: true, messageId: info.messageId };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Send failed" };
    }
  });

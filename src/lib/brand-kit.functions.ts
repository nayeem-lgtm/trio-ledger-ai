import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type BrandKit = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  logo_url: string | null;
  signature_url: string | null;
  brand_color: string | null;
  accent_color: string | null;
  text_color: string | null;
  muted_color: string | null;
  heading_font: string | null;
  body_font: string | null;
  page_size: string | null;
  watermark_text: string | null;
  tagline: string | null;
  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  company_tax_id: string | null;
  footer_text: string | null;
  default_notes: string | null;
  default_terms: string | null;
  default_email_subject: string | null;
  default_email_body: string | null;
};

const SaveSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(80).default("Default"),
  logo_url: z.string().max(1000).nullable().optional(),
  signature_url: z.string().max(1000).nullable().optional(),
  brand_color: z.string().max(20).nullable().optional(),
  accent_color: z.string().max(20).nullable().optional(),
  text_color: z.string().max(20).nullable().optional(),
  muted_color: z.string().max(20).nullable().optional(),
  heading_font: z.string().max(80).nullable().optional(),
  body_font: z.string().max(80).nullable().optional(),
  page_size: z.string().max(20).nullable().optional(),
  watermark_text: z.string().max(120).nullable().optional(),
  tagline: z.string().max(240).nullable().optional(),
  company_name: z.string().max(200).nullable().optional(),
  company_address: z.string().max(1000).nullable().optional(),
  company_email: z.string().max(200).nullable().optional(),
  company_phone: z.string().max(80).nullable().optional(),
  company_website: z.string().max(200).nullable().optional(),
  company_tax_id: z.string().max(120).nullable().optional(),
  footer_text: z.string().max(1000).nullable().optional(),
  default_notes: z.string().max(4000).nullable().optional(),
  default_terms: z.string().max(4000).nullable().optional(),
  default_email_subject: z.string().max(300).nullable().optional(),
  default_email_body: z.string().max(4000).nullable().optional(),
});

export const getBrandKit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BrandKit | null> => {
    const { data, error } = await (context.supabase as any)
      .from("brand_kits")
      .select("*")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as BrandKit) ?? null;
  });

export const saveBrandKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const payload: any = {
      user_id: userId,
      name: data.name,
      is_default: true,
      logo_url: data.logo_url ?? null,
      signature_url: data.signature_url ?? null,
      brand_color: data.brand_color ?? "#0f172a",
      accent_color: data.accent_color ?? "#3b82f6",
      text_color: data.text_color ?? "#0f172a",
      muted_color: data.muted_color ?? "#64748b",
      heading_font: data.heading_font ?? "Inter",
      body_font: data.body_font ?? "Inter",
      page_size: data.page_size ?? "A4",
      watermark_text: data.watermark_text ?? null,
      tagline: data.tagline ?? null,
      company_name: data.company_name ?? null,
      company_address: data.company_address ?? null,
      company_email: data.company_email ?? null,
      company_phone: data.company_phone ?? null,
      company_website: data.company_website ?? null,
      company_tax_id: data.company_tax_id ?? null,
      footer_text: data.footer_text ?? null,
      default_notes: data.default_notes ?? null,
      default_terms: data.default_terms ?? null,
      default_email_subject: data.default_email_subject ?? null,
      default_email_body: data.default_email_body ?? null,
    };
    if (data.id) {
      const { error } = await supabase.from("brand_kits").update(payload).eq("id", data.id).eq("user_id", userId);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await supabase.from("brand_kits").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

// Fetch an image URL and return a data URI (used to embed logo/signature in emailed HTML)
export async function fetchAsDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/png";
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.byteLength; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return `data:${type};base64,${b64}`;
  } catch {
    return null;
  }
}

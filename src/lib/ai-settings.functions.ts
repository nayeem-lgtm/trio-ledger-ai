import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AISettings = {
  provider: "lovable" | "openai" | "gemini";
  openai_api_key: string | null;
  gemini_api_key: string | null;
  openai_model: string;
  gemini_model: string;
  has_openai_key: boolean;
  has_gemini_key: boolean;
};

function mask(k: string | null) {
  if (!k) return null;
  if (k.length < 8) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export const getAISettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AISettings> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return {
      provider: (data?.provider as AISettings["provider"]) ?? "lovable",
      openai_api_key: mask(data?.openai_api_key ?? null),
      gemini_api_key: mask(data?.gemini_api_key ?? null),
      openai_model: data?.openai_model ?? "gpt-4o-mini",
      gemini_model: data?.gemini_model ?? "gemini-2.0-flash",
      has_openai_key: !!data?.openai_api_key,
      has_gemini_key: !!data?.gemini_api_key,
    };
  });

const SaveSchema = z.object({
  provider: z.enum(["lovable", "openai", "gemini"]),
  openai_api_key: z.string().optional().nullable(),
  gemini_api_key: z.string().optional().nullable(),
  openai_model: z.string().min(1).max(80),
  gemini_model: z.string().min(1).max(80),
});

export const saveAISettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Fetch existing to preserve keys when user submits masked / empty values
    const { data: existing } = await supabase
      .from("user_ai_settings")
      .select("openai_api_key, gemini_api_key")
      .eq("user_id", userId)
      .maybeSingle();

    const openaiKey =
      data.openai_api_key && !data.openai_api_key.includes("…")
        ? data.openai_api_key
        : existing?.openai_api_key ?? null;
    const geminiKey =
      data.gemini_api_key && !data.gemini_api_key.includes("…")
        ? data.gemini_api_key
        : existing?.gemini_api_key ?? null;

    const { error } = await supabase.from("user_ai_settings").upsert({
      user_id: userId,
      provider: data.provider,
      openai_api_key: openaiKey,
      gemini_api_key: geminiKey,
      openai_model: data.openai_model,
      gemini_model: data.gemini_model,
    });
    if (error) throw error;
    return { ok: true };
  });

export const clearAIKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ provider: z.enum(["openai", "gemini"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch =
      data.provider === "openai"
        ? { openai_api_key: null }
        : { gemini_api_key: null };
    const { error } = await supabase
      .from("user_ai_settings")
      .update(patch)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const testAIConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: s } = await supabase
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const provider = (s?.provider as "lovable" | "openai" | "gemini") ?? "lovable";

    try {
      if (provider === "openai") {
        if (!s?.openai_api_key) throw new Error("No OpenAI key saved");
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${s.openai_api_key}`,
          },
          body: JSON.stringify({
            model: s.openai_model ?? "gpt-4o-mini",
            messages: [{ role: "user", content: "Say OK" }],
            max_tokens: 5,
          }),
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
      } else if (provider === "gemini") {
        if (!s?.gemini_api_key) throw new Error("No Gemini key saved");
        const model = s.gemini_model ?? "gemini-2.0-flash";
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${s.gemini_api_key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
          },
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
      } else {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) throw new Error("Lovable AI not configured");
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: "Say OK" }],
          }),
        });
        if (!res.ok) throw new Error(`Lovable AI ${res.status}`);
      }
      return { ok: true, provider };
    } catch (e: any) {
      return { ok: false, provider, error: e?.message ?? "Unknown error" };
    }
  });

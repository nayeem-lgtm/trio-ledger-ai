import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(messages: { role: string; content: string }[]) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI gateway not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (res.status === 429) throw new Error("AI rate limit hit. Please retry shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Settings.");
  if (!res.ok) throw new Error(`AI error: ${res.status}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

const SuggestSchema = z.object({
  description: z.string().min(1).max(500),
  type: z.enum(["income", "expense"]),
  categories: z.array(z.string()).max(100),
});

export const suggestCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SuggestSchema.parse(d))
  .handler(async ({ data }) => {
    const list = data.categories.join(", ");
    const content = await callAI([
      {
        role: "system",
        content:
          "You are an accounting categorization assistant. Return ONLY the single best matching category name from the provided list. No commentary, no punctuation.",
      },
      {
        role: "user",
        content: `Transaction type: ${data.type}\nDescription: "${data.description}"\nAvailable categories: ${list}\n\nReturn one category name exactly as written.`,
      },
    ]);
    return { category: content.trim().replace(/^["'`]|["'`.]$/g, "") };
  });

const InsightSchema = z.object({
  businessName: z.string(),
  monthLabel: z.string(),
  income: z.number(),
  expense: z.number(),
  topExpenses: z.array(z.object({ name: z.string(), total: z.number() })).max(20),
});

export const monthlyInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InsightSchema.parse(d))
  .handler(async ({ data }) => {
    const lines = data.topExpenses.map((t) => `- ${t.name}: $${t.total.toFixed(2)}`).join("\n");
    const content = await callAI([
      {
        role: "system",
        content:
          "You are a sharp CFO writing a tight 3–5 sentence monthly narrative for a small business owner. Use plain English, mention margin %, call out the biggest expense drivers, and end with one specific actionable suggestion. No fluff, no headers, no markdown.",
      },
      {
        role: "user",
        content: `Business: ${data.businessName}\nMonth: ${data.monthLabel}\nRevenue: $${data.income.toFixed(2)}\nExpenses: $${data.expense.toFixed(2)}\nNet: $${(data.income - data.expense).toFixed(2)}\nTop expense categories:\n${lines || "(none)"}`,
      },
    ]);
    return { insight: content.trim() };
  });

const QuerySchema = z.object({
  question: z.string().min(1).max(500),
});

export const askLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuerySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [bizRes, txRes] = await Promise.all([
      supabase.from("businesses").select("id, name").eq("user_id", userId),
      supabase
        .from("transactions")
        .select("type, amount, transaction_date, vendor, description, businesses(name), categories(name)")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .limit(500),
    ]);
    if (bizRes.error) throw bizRes.error;
    if (txRes.error) throw txRes.error;

    const ctx = {
      businesses: bizRes.data,
      transactions: (txRes.data ?? []).map((t: any) => ({
        date: t.transaction_date,
        business: t.businesses?.name,
        category: t.categories?.name,
        type: t.type,
        amount: Number(t.amount),
        vendor: t.vendor,
        description: t.description,
      })),
    };

    const content = await callAI([
      {
        role: "system",
        content:
          "You are an accounting analyst with access to the user's full ledger as JSON. Answer the user's question precisely using only that data. Use USD with $ formatting. If the data is empty or insufficient, say so. Keep answers under 6 sentences unless a list is requested.",
      },
      {
        role: "user",
        content: `LEDGER:\n${JSON.stringify(ctx)}\n\nQUESTION: ${data.question}`,
      },
    ]);
    return { answer: content.trim() };
  });

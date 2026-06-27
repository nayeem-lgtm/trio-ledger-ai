import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { askLedger } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai")({
  component: AIPage,
});

const SAMPLES = [
  "What was my biggest expense last month?",
  "Which business is most profitable this quarter?",
  "Compare Ecommerce vs Affiliate revenue this year",
  "How much did I spend on software in total?",
];

type Msg = { role: "user" | "assistant"; content: string };

function AIPage() {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(askLedger);

  const submit = async (text?: string) => {
    const question = (text ?? q).trim();
    if (!question) return;
    setQ("");
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await ask({ data: { question } });
      setMsgs((m) => [...m, { role: "assistant", content: res.answer }]);
    } catch (e: any) {
      toast.error(e.message ?? "AI failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1">Ask anything about your books in plain English.</p>
      </div>

      {msgs.length === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Try asking</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="text-left text-sm p-3 rounded-md border border-border hover:border-primary/50 hover:bg-accent/40 transition-colors"
              >
                {s}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-card border border-border">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="sticky bottom-4 flex gap-2 bg-card border border-border rounded-xl p-2"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about your finances…"
          className="border-0 focus-visible:ring-0 bg-transparent"
        />
        <Button type="submit" disabled={loading} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

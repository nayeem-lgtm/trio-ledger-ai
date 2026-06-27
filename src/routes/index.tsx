import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Bot, FileDown, Layers } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Cash Flow — Multi-Business Accounting" },
      {
        name: "description",
        content:
          "Track Affiliate, Ecommerce, and Insurance accounting in one place with AI insights and downloadable monthly reports.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Cash Flow</span>
          </div>
          <Link to="/auth">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI-powered, multi-business accounting
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-6xl">
            One ledger.<br />
            <span className="text-primary">Every business you run.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Track revenue, expenses, salaries, software, supplies — A to Z — across Affiliate,
            Ecommerce, Insurance and any business you add. Per-business dashboards, a unified view,
            and AI that answers your numbers in plain English.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: BarChart3,
              title: "Per-business + unified dashboards",
              desc: "Drill into one business or see the full picture across all of them.",
            },
            {
              icon: Bot,
              title: "AI categorization & insights",
              desc: "Auto-suggest categories, monthly narratives, and natural-language queries.",
            },
            {
              icon: FileDown,
              title: "Monthly P&L reports",
              desc: "Download polished PDF or Excel reports for any month, any business.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border/60 bg-card p-6">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Shield,
  LayoutDashboard,
  Table2,
  PhoneCall,
  ClipboardCheck,
  Wallet,
  Receipt,
  UserCog,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AgentFilter } from "./AgentFilter";
import { InsuranceFiltersProvider, useIsCEO } from "./shared";
import { buildPreset, fmtRange, type DateRange } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

const NAV = [
  { to: "/insurance", label: "Overview", icon: LayoutDashboard, exact: true, group: "Reports" },
  { to: "/insurance/sales", label: "Sales & Policies", icon: Table2, group: "Reports" },
  { to: "/insurance/daily-ops", label: "Daily Ops", icon: PhoneCall, group: "Reports" },
  { to: "/insurance/qa", label: "Paid Call QA", icon: ClipboardCheck, group: "Reports" },
  { to: "/insurance/payroll", label: "Payroll", icon: Wallet, group: "Operations" },
  { to: "/insurance/payables", label: "Company Payables", icon: Receipt, group: "Operations" },
  { to: "/insurance/agents", label: "Agent Master", icon: UserCog, group: "Operations" },
  { to: "/insurance/tiers", label: "Commission Tiers", icon: Shield, group: "Operations" },
] as const;

export function InsuranceShell({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isCEO = false } = useIsCEO();

  const [range, setRange] = useState<DateRange>(() => buildPreset("this_month"));
  const [agents, setAgents] = useState<string[]>([]);

  const stepRange = (dir: -1 | 1) => {
    const days = Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1;
    const from = new Date(range.from);
    const to = new Date(range.to);
    from.setDate(from.getDate() + dir * days);
    to.setDate(to.getDate() + dir * days);
    setRange({ from, to });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const groups = ["Reports", "Operations"] as const;

  const activePage = NAV.find((n) => (pathname === n.to));
  const pageTitle = activePage?.label ?? "Overview";

  return (
    <InsuranceFiltersProvider value={{ range, setRange, agents, setAgents, stepRange }}>
      <div className="min-h-screen flex bg-background">
        <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
          <div className="px-4 py-4 border-b border-sidebar-border/60 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md bg-primary/15 border border-primary/30 grid place-items-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="leading-tight flex-1 min-w-0">
              <div className="font-display font-semibold tracking-tight text-[15px] truncate">Insurance HQ</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">Policy Bear</div>
            </div>
          </div>

          <nav className="flex-1 overflow-auto py-3">
            {groups.map((g) => (
              <div key={g} className="mb-4">
                <div className="px-5 mb-1 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">
                  {g}
                </div>
                <div className="px-2 space-y-0.5">
                  {NAV.filter((n) => n.group === g).map((n) => {
                    const active = pathname === n.to;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-2 border-transparent",
                        )}
                      >
                        <n.icon className="h-4 w-4" />
                        {n.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-sidebar-border/60 space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Cashflow
            </Link>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/70" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20 flex items-center gap-3 px-6">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Insurance</div>
              <div className="font-display font-semibold text-sm truncate">{pageTitle}</div>
            </div>
            {isCEO && (
              <Badge variant="secondary" className="gap-1 text-[10px] uppercase tracking-wider">
                <Shield className="h-3 w-3" /> CEO
              </Badge>
            )}
            <AgentFilter selected={agents} onChange={setAgents} />
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => stepRange(-1)} title="Previous period">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DateRangePicker value={range} onChange={setRange} />
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => stepRange(1)} title="Next period">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <ThemeToggle compact />
          </header>

          {agents.length > 0 && (
            <div className="px-6 py-2 border-b border-border/60 bg-muted/20 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
              <span>Range: <b className="text-foreground">{fmtRange(range)}</b></span>
              <span>·</span>
              <span>Agents:</span>
              {agents.map((a) => (
                <Badge key={a} variant="secondary" className="gap-1">
                  {a}
                  <button onClick={() => setAgents(agents.filter((x) => x !== a))} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <button onClick={() => setAgents([])} className="underline hover:text-foreground">Clear</button>
            </div>
          )}

          <main className="flex-1 overflow-auto p-6">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </InsuranceFiltersProvider>
  );
}

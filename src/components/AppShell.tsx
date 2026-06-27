import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { businessesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import {
  Layers,
  LayoutDashboard,
  ListPlus,
  Tags,
  Sparkles,
  LogOut,
  Briefcase,
  PlusCircle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import { BusinessDialog } from "@/components/BusinessDialog";
import { useQueryClient } from "@tanstack/react-query";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: businesses = [] } = useQuery(businessesQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openBiz, setOpenBiz] = useState(false);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const nav = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/transactions", label: "Transactions", icon: ListPlus },
    { to: "/categories", label: "Categories", icon: Tags },
    { to: "/ai", label: "AI Assistant", icon: Sparkles },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border/60">
          <div className="h-9 w-9 rounded-md gradient-primary grid place-items-center shadow-soft">
            <Layers className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold tracking-tight text-[15px]">Ledger</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
              Finance OS
            </div>
          </div>
        </div>

        <div className="px-5 mt-5 mb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">
          Workspace
        </div>
        <nav className="px-3 space-y-0.5">
          {nav.map((n) => {
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
        </nav>

        <div className="px-5 mt-6 mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">
            Entities
          </span>
          <button
            onClick={() => setOpenBiz(true)}
            className="text-sidebar-foreground/60 hover:text-primary transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-3 space-y-0.5 flex-1 overflow-auto">
          {businesses.map((b) => {
            const to = `/business/${b.id}`;
            const active = pathname === to;
            return (
              <Link
                key={b.id}
                to="/business/$businessId"
                params={{ businessId: b.id }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full ring-2 ring-sidebar"
                  style={{ backgroundColor: b.color }}
                />
                <span className="truncate">{b.name}</span>
                <Briefcase className="h-3.5 w-3.5 ml-auto opacity-30" />
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-sidebar-border/60">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/70" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>

      <BusinessDialog open={openBiz} onOpenChange={setOpenBiz} />
    </div>
  );
}

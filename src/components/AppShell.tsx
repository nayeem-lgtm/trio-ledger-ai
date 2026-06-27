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
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">Ledger AI</span>
        </div>

        <nav className="px-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 mt-6 mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-sidebar-foreground/50">
            Businesses
          </span>
          <button
            onClick={() => setOpenBiz(true)}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <PlusCircle className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3 space-y-1 flex-1 overflow-auto">
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
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                <Briefcase className="h-4 w-4 opacity-50" />
                <span className="truncate">{b.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
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

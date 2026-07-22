import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

export function AgentFilter({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const client = supabase as any;
  const { data: agentList = [] } = useQuery({
    queryKey: ["ins-agent-names"],
    queryFn: async () => {
      const [a, s, r, d, p] = await Promise.all([
        client.from("insurance_agents").select("name"),
        client.from("insurance_sales").select("agent"),
        client.from("insurance_ringba").select("agent"),
        client.from("insurance_agent_daily").select("agent"),
        client.from("insurance_payroll").select("agent"),
      ]);
      const set = new Set<string>();
      for (const row of a.data ?? []) if (row.name) set.add(row.name);
      for (const src of [s.data, r.data, d.data, p.data]) {
        for (const row of src ?? []) if (row.agent) set.add(row.agent);
      }
      return Array.from(set).sort((x, y) => x.localeCompare(y));
    },
  });

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 font-normal">
          <Users className="h-4 w-4 opacity-70" />
          {selected.length === 0 ? "All agents" : `${selected.length} agent${selected.length > 1 ? "s" : ""}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Filter by agent</span>
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="text-xs underline text-muted-foreground hover:text-foreground">
              Clear
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {agentList.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-4 text-center">No agents yet.</div>
          )}
          {agentList.map((name: string) => (
            <label key={name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
              <Checkbox checked={selected.includes(name)} onCheckedChange={() => toggle(name)} />
              <span className="truncate">{name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

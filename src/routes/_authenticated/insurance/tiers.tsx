import { createFileRoute } from "@tanstack/react-router";
import { SheetGrid } from "@/lib/insurance/SheetGrid";
import { SHEETS, useInsuranceFilters } from "@/lib/insurance/shared";

export const Route = createFileRoute("/_authenticated/insurance/tiers")({
  component: () => {
    const { range, agents } = useInsuranceFilters();
    const cfg = SHEETS.tiers;
    return (
      <div className="space-y-3 max-w-[1600px] mx-auto">
        <div>
          <h1 className="font-display font-semibold text-xl">{cfg.label}</h1>
          <p className="text-sm text-muted-foreground">{cfg.description}</p>
        </div>
        <SheetGrid sheetKey="tiers" range={range} agents={agents} />
      </div>
    );
  },
});

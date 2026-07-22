import { createFileRoute } from "@tanstack/react-router";
import { SheetGrid } from "@/lib/insurance/SheetGrid";
import { SHEETS, useInsuranceFilters } from "@/lib/insurance/shared";

export const Route = createFileRoute("/_authenticated/insurance/sales")({
  component: () => <Page />,
});

function Page() {
  const { range, agents } = useInsuranceFilters();
  return (
    <div className="space-y-3 max-w-[1600px] mx-auto">
      <Header k="sales" />
      <SheetGrid sheetKey="sales" range={range} agents={agents} />
    </div>
  );
}

function Header({ k }: { k: "sales" }) {
  const cfg = SHEETS[k];
  return (
    <div>
      <h1 className="font-display font-semibold text-xl">{cfg.label}</h1>
      <p className="text-sm text-muted-foreground">{cfg.description}</p>
    </div>
  );
}

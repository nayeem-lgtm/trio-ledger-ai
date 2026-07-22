import { createFileRoute } from "@tanstack/react-router";
import { InsuranceShell } from "@/lib/insurance/InsuranceShell";

export const Route = createFileRoute("/_authenticated/insurance")({
  component: InsuranceShell,
});

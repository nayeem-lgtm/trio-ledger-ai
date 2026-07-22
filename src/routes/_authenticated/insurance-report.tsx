import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/insurance-report")({
  beforeLoad: () => {
    throw redirect({ to: "/insurance" });
  },
});

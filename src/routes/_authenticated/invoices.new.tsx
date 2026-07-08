import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  component: () => <Navigate to="/invoices/$invoiceId" params={{ invoiceId: "new" }} />,
});

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Send, CircleDollarSign, Eye } from "lucide-react";
import { listInvoices, deleteInvoice, markInvoicePaid } from "@/lib/invoices.functions";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const listFn = useServerFn(listInvoices);
  const delFn = useServerFn(deleteInvoice);
  const paidFn = useServerFn(markInvoicePaid);
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => listFn() });

  const statusColor: Record<string, string> = {
    draft: "bg-slate-500/10 text-slate-500",
    sent: "bg-blue-500/10 text-blue-500",
    paid: "bg-emerald-500/10 text-emerald-500",
    overdue: "bg-red-500/10 text-red-500",
    cancelled: "bg-muted text-muted-foreground",
  };

  const totals = invoices.reduce(
    (acc: any, i: any) => {
      if (i.status === "paid") acc.paid += Number(i.total);
      else if (i.status !== "cancelled") acc.outstanding += Number(i.total);
      return acc;
    },
    { paid: 0, outstanding: 0 },
  );

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Invoicing</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">Create, send and track invoices for your buyers.</p>
          </div>
          <Link to="/invoices/new"><Button className="gap-2"><Plus className="h-4 w-4" />New invoice</Button></Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Paid</div><div className="text-2xl font-semibold mt-1 text-emerald-500">{fmtMoney(totals.paid)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-2xl font-semibold mt-1 text-amber-500">{fmtMoney(totals.outstanding)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total invoices</div><div className="text-2xl font-semibold mt-1">{invoices.length}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">All invoices</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {invoices.length === 0 && (
                <div className="p-12 text-sm text-muted-foreground text-center">No invoices yet. Create your first one.</div>
              )}
              {invoices.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between p-4 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{i.invoice_number}</div>
                      <Badge className={`${statusColor[i.status]} border-0 capitalize`}>{i.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {i.buyers?.name ?? "—"} · Issued {i.issue_date}{i.due_date ? ` · Due ${i.due_date}` : ""}
                    </div>
                  </div>
                  <div className="font-semibold">{fmtMoney(Number(i.total))}</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId: i.id } })}><Eye className="h-4 w-4" /></Button>
                    {i.status !== "paid" && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await paidFn({ data: { id: i.id } });
                        toast.success("Marked paid & synced");
                        qc.invalidateQueries({ queryKey: ["invoices"] });
                        qc.invalidateQueries({ queryKey: ["transactions"] });
                      }}><CircleDollarSign className="h-4 w-4" /></Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm("Delete this invoice?")) return;
                      await delFn({ data: { id: i.id } });
                      qc.invalidateQueries({ queryKey: ["invoices"] });
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

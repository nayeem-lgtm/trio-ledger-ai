import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/insurance/checklist")({
  component: ChecklistPage,
});

const COMPANY_SETTINGS: { label: string; value: string; notes: string }[] = [
  { label: "Default Hourly Rate", value: "$15.00", notes: "USD / hour" },
  { label: "CallTools Monthly Seat Cost", value: "$150.00", notes: "USD / agent / month" },
  { label: "CallTools Weekly Cost Formula", value: "$34.62", notes: "Used in Payroll & Costs" },
  { label: "Ringba Billing Rule", value: "Paid after 120 seconds", notes: "Manual input from Ringba" },
  { label: "Main Sales Goal", value: "1 sale per 2 paid Ringba calls", notes: "Dashboard target" },
  { label: "Base Payroll Payment Timing", value: "Weekly through Gusto", notes: "Paid weekly" },
  { label: "Commission Payment Timing", value: "Monthly after management review", notes: "Paid end of month" },
  { label: "Ringba Payment Timing", value: "End of month", notes: "Company payable" },
  { label: "Carrier Revenue Timing", value: "After customer first payment posted", notes: "Manual received date/amount" },
];

const PAYMENT_METHODS: { method: string; rule: string; source: string }[] = [
  {
    method: "Bank Draft / ACH (Preferred)",
    rule: "Preferred",
    source: "American Amicable bank draft authorization form — supports checking/savings draft & draft-date options.",
  },
  {
    method: "Direct Billing",
    rule: "High cancellation risk",
    source: "American Amicable reinstatement guidance references direct bill as an alternative to bank draft.",
  },
  {
    method: "Credit / Debit Card via Express Pay",
    rule: "Confirm availability",
    source: "American Amicable resources/support pages describe Express Pay by credit/debit card.",
  },
  {
    method: "Check / Money Order",
    rule: "Confirm with carrier before use",
    source: "Use only if carrier/billing process explicitly supports it.",
  },
  {
    method: "Unknown / Pending",
    rule: "Needs update",
    source: "Use temporarily until application/payment details are confirmed.",
  },
];

const DROPDOWNS: { title: string; values: string[] }[] = [
  { title: "Sale Sources", values: ["Ringba", "Callback", "Personal Lead", "Referral", "Other"] },
  { title: "Sale Status", values: ["Issued", "Pending", "Submitted", "Held", "Cancelled", "Chargeback", "Rejected", "Pending QC"] },
  { title: "Payment Status", values: ["Pending First Payment", "First Payment Posted", "Active/Paid", "Missed Payment", "Cancelled", "Chargeback"] },
  { title: "QA Status", values: ["Sold", "Bad Paid Call", "Medium - Callback", "Potential Lost Call", "Qualified No Sale", "Needs Review", "Provisional Sold"] },
  { title: "Pay Status", values: ["Payable", "Paid", "Hold", "Not Due", "N/A"] },
  { title: "Yes / No", values: ["Yes", "No"] },
];

function ChecklistPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="font-display font-semibold text-xl">Default Checklist</h1>
        <p className="text-sm text-muted-foreground">
          Company defaults, payment method rules, and the master dropdown lists used across every sheet.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Company Settings</h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Setting</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {COMPANY_SETTINGS.map((s) => (
                <tr key={s.label} className="border-t border-border/60">
                  <td className="px-4 py-2 font-medium">{s.label}</td>
                  <td className="px-4 py-2 tabular-nums">{s.value}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Methods</h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Risk / Operating Rule</th>
                <th className="px-4 py-2 font-medium">Source / Note</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENT_METHODS.map((m) => (
                <tr key={m.method} className="border-t border-border/60">
                  <td className="px-4 py-2 font-medium">{m.method}</td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="font-normal">{m.rule}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{m.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dropdown Lists</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DROPDOWNS.map((d) => (
            <Card key={d.title} className="p-4">
              <div className="text-sm font-semibold mb-2">{d.title}</div>
              <ul className="space-y-1">
                {d.values.map((v) => (
                  <li key={v} className="text-sm text-muted-foreground">• {v}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Agents pull live from the <b>Agents Information</b> sheet — add or deactivate agents there and every dropdown updates automatically.
        </p>
      </section>
    </div>
  );
}

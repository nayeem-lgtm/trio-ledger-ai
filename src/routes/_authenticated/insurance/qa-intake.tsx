import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { isoOf } from "@/lib/insurance/shared";

export const Route = createFileRoute("/_authenticated/insurance/qa-intake")({
  component: QAIntakePage,
});

type Form = {
  entry_date: string;
  agent: string;
  ringba_target: string;
  caller_id: string;
  paid_call_cost: string;
  duration: string;
  qa_status: string;
  sale_outcome: string;
  loss_reason: string;
  callback_needed: boolean;
  follow_up_owner: string;
  payment_method_seen: string;
  customer_name: string;
  state: string;
  policy_number: string;
  policy_start_date: string;
  notes: string;
};

const EMPTY: Form = {
  entry_date: isoOf(new Date()),
  agent: "",
  ringba_target: "",
  caller_id: "",
  paid_call_cost: "",
  duration: "",
  qa_status: "",
  sale_outcome: "",
  loss_reason: "",
  callback_needed: false,
  follow_up_owner: "",
  payment_method_seen: "",
  customer_name: "",
  state: "",
  policy_number: "",
  policy_start_date: "",
  notes: "",
};

const QA_STATUS = ["Sold", "Bad Paid Call", "Medium - Callback", "Potential Lost Call", "Qualified No Sale", "Needs Review", "Provisional Sold"];
const SALE_OUTCOME = ["Sale", "No Sale", "Callback", "Pending", "Chargeback"];
const PAYMENT_METHODS = ["Bank Draft/ACH", "Direct Billing", "Credit/Debit Card", "Check/Money Order", "Unknown/Pending"];

function QAIntakePage() {
  const qc = useQueryClient();
  const client = supabase as any;
  const [f, setF] = useState<Form>(EMPTY);

  const { data: agents = [] } = useQuery({
    queryKey: ["ins-agent-names-form"],
    queryFn: async () => {
      const { data } = await client.from("insurance_agents").select("name").order("name");
      return ((data ?? []) as { name: string }[]).map((r) => r.name).filter(Boolean);
    },
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload: Record<string, any> = {
        owner_id: u.user.id,
        entry_date: f.entry_date || null,
        agent: f.agent || null,
        ringba_target: f.ringba_target || null,
        caller_id: f.caller_id || null,
        paid_call_cost: f.paid_call_cost === "" ? null : Number(f.paid_call_cost),
        duration: f.duration || null,
        qa_status: f.qa_status || null,
        sale_outcome: f.sale_outcome || null,
        loss_reason: f.loss_reason || null,
        callback_needed: f.callback_needed,
        follow_up_owner: f.follow_up_owner || null,
        payment_method_seen: f.payment_method_seen || null,
        customer_name: f.customer_name || null,
        state: f.state || null,
        policy_number: f.policy_number || null,
        policy_start_date: f.policy_start_date || null,
        notes: f.notes || null,
      };
      const { error } = await client.from("insurance_paid_qa").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("QA record saved");
      qc.invalidateQueries({ queryKey: ["ins", "insurance_paid_qa"] });
      setF({ ...EMPTY, entry_date: isoOf(new Date()), agent: f.agent });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="font-display font-semibold text-xl">QA Intake Form</h1>
        <p className="text-sm text-muted-foreground">
          Quick form to submit a paid-call QA review. Rows flow into <b>Paid Call QA</b>.
        </p>
      </div>

      <Card className="p-6">
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <Field label="Date">
            <Input type="date" value={f.entry_date} onChange={(e) => set("entry_date", e.target.value)} required />
          </Field>
          <Field label="Agent Name">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={f.agent}
              onChange={(e) => set("agent", e.target.value)}
              required
            >
              <option value="">Select agent…</option>
              {agents.map((a: string) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Ringba Target">
            <Input value={f.ringba_target} onChange={(e) => set("ringba_target", e.target.value)} />
          </Field>
          <Field label="Caller ID">
            <Input value={f.caller_id} onChange={(e) => set("caller_id", e.target.value)} />
          </Field>
          <Field label="Paid Call Cost ($)">
            <Input type="number" step="0.01" value={f.paid_call_cost} onChange={(e) => set("paid_call_cost", e.target.value)} />
          </Field>
          <Field label="Duration">
            <Input placeholder="e.g. 3:24" value={f.duration} onChange={(e) => set("duration", e.target.value)} />
          </Field>
          <Field label="QA Status">
            <Select value={f.qa_status} onChange={(v) => set("qa_status", v)} options={QA_STATUS} />
          </Field>
          <Field label="Sale Outcome">
            <Select value={f.sale_outcome} onChange={(v) => set("sale_outcome", v)} options={SALE_OUTCOME} />
          </Field>
          <Field label="Loss Reason">
            <Input value={f.loss_reason} onChange={(e) => set("loss_reason", e.target.value)} />
          </Field>
          <Field label="Follow-up Owner">
            <Input value={f.follow_up_owner} onChange={(e) => set("follow_up_owner", e.target.value)} />
          </Field>
          <Field label="Payment Method Seen?">
            <Select value={f.payment_method_seen} onChange={(v) => set("payment_method_seen", v)} options={PAYMENT_METHODS} />
          </Field>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="cb"
              checked={f.callback_needed}
              onCheckedChange={(v) => set("callback_needed", Boolean(v))}
            />
            <Label htmlFor="cb" className="cursor-pointer">Callback needed?</Label>
          </div>
          <Field label="Customer Name">
            <Input value={f.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
          </Field>
          <Field label="State">
            <Input maxLength={2} value={f.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Policy #">
            <Input value={f.policy_number} onChange={(e) => set("policy_number", e.target.value)} />
          </Field>
          <Field label="Policy Start Date">
            <Input type="date" value={f.policy_start_date} onChange={(e) => set("policy_start_date", e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setF(EMPTY)}>
              Reset
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Saving…" : "Save QA record"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

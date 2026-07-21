
-- Sales & Policies additions
ALTER TABLE public.insurance_sales
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS policy_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_risk TEXT,
  ADD COLUMN IF NOT EXISTS premium_draft_date DATE,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS carrier_revenue_received_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS carrier_revenue_received BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revenue_received_date DATE,
  ADD COLUMN IF NOT EXISTS commission_eligible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS publisher TEXT,
  ADD COLUMN IF NOT EXISTS qa_status TEXT,
  ADD COLUMN IF NOT EXISTS callback_converted BOOLEAN DEFAULT FALSE;

-- Paid Call QA additions
ALTER TABLE public.insurance_paid_qa
  ADD COLUMN IF NOT EXISTS payment_method_seen TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS policy_number TEXT,
  ADD COLUMN IF NOT EXISTS policy_start_date DATE;

-- Ringba/Daily Ops merge additions
ALTER TABLE public.insurance_ringba
  ADD COLUMN IF NOT EXISTS paid_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS ended INTEGER,
  ADD COLUMN IF NOT EXISTS cost_per_sale NUMERIC,
  ADD COLUMN IF NOT EXISTS ct_total_dispositions INTEGER,
  ADD COLUMN IF NOT EXISTS ct_customer_hang_up INTEGER,
  ADD COLUMN IF NOT EXISTS ct_call_back_scheduled INTEGER,
  ADD COLUMN IF NOT EXISTS ct_busy_call_back_later INTEGER,
  ADD COLUMN IF NOT EXISTS ct_sale_made INTEGER,
  ADD COLUMN IF NOT EXISTS ct_not_interested INTEGER,
  ADD COLUMN IF NOT EXISTS ct_no_contact INTEGER,
  ADD COLUMN IF NOT EXISTS ct_dnc INTEGER,
  ADD COLUMN IF NOT EXISTS ct_total_calls INTEGER,
  ADD COLUMN IF NOT EXISTS ct_inbound_calls INTEGER,
  ADD COLUMN IF NOT EXISTS ct_outbound_calls INTEGER,
  ADD COLUMN IF NOT EXISTS ct_phone_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS ringba_cost_status TEXT,
  ADD COLUMN IF NOT EXISTS calltools_source TEXT,
  ADD COLUMN IF NOT EXISTS manager_notes TEXT;

-- Agents additions
ALTER TABLE public.insurance_agents
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 15,
  ADD COLUMN IF NOT EXISTS calltools_seat_cost NUMERIC DEFAULT 150,
  ADD COLUMN IF NOT EXISTS licensed_states TEXT,
  ADD COLUMN IF NOT EXISTS primary_carrier TEXT,
  ADD COLUMN IF NOT EXISTS product_focus TEXT;

-- Payroll additions
ALTER TABLE public.insurance_payroll
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS paid_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS base_payroll_due NUMERIC,
  ADD COLUMN IF NOT EXISTS base_pay_status TEXT,
  ADD COLUMN IF NOT EXISTS base_paid_date DATE,
  ADD COLUMN IF NOT EXISTS calltools_weekly_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS other_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS total_company_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS carrier_revenue_received NUMERIC,
  ADD COLUMN IF NOT EXISTS premium_written NUMERIC,
  ADD COLUMN IF NOT EXISTS net_cash_position NUMERIC,
  ADD COLUMN IF NOT EXISTS end_month_agent_payable NUMERIC;

-- New Company Payables table
CREATE TABLE IF NOT EXISTS public.insurance_payables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  cost_date DATE,
  week_start DATE,
  month TEXT,
  cost_category TEXT,
  vendor_agent TEXT,
  amount NUMERIC DEFAULT 0,
  due_date DATE,
  payment_status TEXT,
  paid_date DATE,
  related_week DATE,
  notes TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_payables TO authenticated;
GRANT ALL ON public.insurance_payables TO service_role;

ALTER TABLE public.insurance_payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_payables_select" ON public.insurance_payables
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(owner_id, auth.uid()));

CREATE POLICY "insurance_payables_insert" ON public.insurance_payables
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_workspace(owner_id, auth.uid()) AND owner_id = auth.uid() OR public.can_write_workspace(owner_id, auth.uid()));

CREATE POLICY "insurance_payables_update" ON public.insurance_payables
  FOR UPDATE TO authenticated
  USING (public.can_write_workspace(owner_id, auth.uid()))
  WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));

CREATE POLICY "insurance_payables_delete" ON public.insurance_payables
  FOR DELETE TO authenticated
  USING (public.can_admin_workspace(owner_id, auth.uid()));

CREATE TRIGGER trg_insurance_payables_updated
  BEFORE UPDATE ON public.insurance_payables
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

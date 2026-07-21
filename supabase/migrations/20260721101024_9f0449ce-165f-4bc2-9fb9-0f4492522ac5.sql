
-- Add JSONB "extra" for custom columns to every insurance sheet
ALTER TABLE public.insurance_sales ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.insurance_calltools ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.insurance_ringba ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.insurance_paid_qa ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.insurance_agent_daily ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.insurance_agents ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.insurance_commission_tiers ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Definitions of user-added columns per sheet
CREATE TABLE IF NOT EXISTS public.insurance_custom_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  sheet_key TEXT NOT NULL,
  col_key TEXT NOT NULL,
  label TEXT NOT NULL,
  col_type TEXT NOT NULL DEFAULT 'text',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, sheet_key, col_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_custom_columns TO authenticated;
GRANT ALL ON public.insurance_custom_columns TO service_role;
ALTER TABLE public.insurance_custom_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_cc_select" ON public.insurance_custom_columns FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_cc_write" ON public.insurance_custom_columns FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_cc_update" ON public.insurance_custom_columns FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_cc_delete" ON public.insurance_custom_columns FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE TRIGGER trg_ins_cc_updated BEFORE UPDATE ON public.insurance_custom_columns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Editable weekly payroll (manual entries live alongside auto-derived rows)
CREATE TABLE IF NOT EXISTS public.insurance_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  week_start DATE,
  agent TEXT,
  total_sales NUMERIC DEFAULT 0,
  commission_per_sale NUMERIC DEFAULT 0,
  sales_commission NUMERIC DEFAULT 0,
  personal_lead_incentive NUMERIC DEFAULT 0,
  total_agent_pay NUMERIC DEFAULT 0,
  ringba_sales NUMERIC DEFAULT 0,
  paid_calls NUMERIC DEFAULT 0,
  ringba_cost NUMERIC DEFAULT 0,
  notes TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_payroll TO authenticated;
GRANT ALL ON public.insurance_payroll TO service_role;
ALTER TABLE public.insurance_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_pr_select" ON public.insurance_payroll FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_pr_write" ON public.insurance_payroll FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_pr_update" ON public.insurance_payroll FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_pr_delete" ON public.insurance_payroll FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE TRIGGER trg_ins_pr_updated BEFORE UPDATE ON public.insurance_payroll FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

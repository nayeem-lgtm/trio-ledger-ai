
-- Agents
CREATE TABLE public.insurance_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_agents TO authenticated;
GRANT ALL ON public.insurance_agents TO service_role;
ALTER TABLE public.insurance_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_agents_select" ON public.insurance_agents FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_agents_write" ON public.insurance_agents FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_agents_update" ON public.insurance_agents FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_agents_delete" ON public.insurance_agents FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));

-- Commission tiers
CREATE TABLE public.insurance_commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  tier_name TEXT,
  min_sales NUMERIC DEFAULT 0,
  max_sales NUMERIC,
  commission_per_sale NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_commission_tiers TO authenticated;
GRANT ALL ON public.insurance_commission_tiers TO service_role;
ALTER TABLE public.insurance_commission_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_tiers_select" ON public.insurance_commission_tiers FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_tiers_write" ON public.insurance_commission_tiers FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_tiers_update" ON public.insurance_commission_tiers FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_tiers_delete" ON public.insurance_commission_tiers FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));

-- Sales log
CREATE TABLE public.insurance_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  sale_date DATE,
  week_start DATE,
  agent TEXT,
  source TEXT,
  ringba_target TEXT,
  product TEXT,
  carrier TEXT,
  policy_amount NUMERIC DEFAULT 0,
  monthly_premium NUMERIC DEFAULT 0,
  sale_status TEXT,
  count_sale BOOLEAN DEFAULT true,
  personal_lead_incentive NUMERIC DEFAULT 0,
  notes TEXT,
  policy_start_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_sales TO authenticated;
GRANT ALL ON public.insurance_sales TO service_role;
ALTER TABLE public.insurance_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_sales_select" ON public.insurance_sales FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_sales_write" ON public.insurance_sales FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_sales_update" ON public.insurance_sales FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_sales_delete" ON public.insurance_sales FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));

-- CallTools log
CREATE TABLE public.insurance_calltools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  entry_date DATE,
  week_start DATE,
  agent TEXT,
  total_dispositions INTEGER DEFAULT 0,
  customer_hang_up INTEGER DEFAULT 0,
  call_back_scheduled INTEGER DEFAULT 0,
  busy_call_back_later INTEGER DEFAULT 0,
  goal_disposition INTEGER DEFAULT 0,
  not_interested INTEGER DEFAULT 0,
  no_contact INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_calltools TO authenticated;
GRANT ALL ON public.insurance_calltools TO service_role;
ALTER TABLE public.insurance_calltools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_ct_select" ON public.insurance_calltools FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_ct_write" ON public.insurance_calltools FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_ct_update" ON public.insurance_calltools FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_ct_delete" ON public.insurance_calltools FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));

-- Ringba
CREATE TABLE public.insurance_ringba (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  entry_date DATE,
  week_start DATE,
  agent TEXT,
  ringba_target TEXT,
  incoming INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  connected INTEGER DEFAULT 0,
  paid_calls INTEGER DEFAULT 0,
  cost_to_ray NUMERIC DEFAULT 0,
  paid_out_pct NUMERIC DEFAULT 0,
  acl NUMERIC DEFAULT 0,
  ringba_sales INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_ringba TO authenticated;
GRANT ALL ON public.insurance_ringba TO service_role;
ALTER TABLE public.insurance_ringba ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_rb_select" ON public.insurance_ringba FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_rb_write" ON public.insurance_ringba FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_rb_update" ON public.insurance_ringba FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_rb_delete" ON public.insurance_ringba FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));

-- Paid Call QA
CREATE TABLE public.insurance_paid_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  entry_date DATE,
  agent TEXT,
  ringba_target TEXT,
  caller_id TEXT,
  paid_call_cost NUMERIC DEFAULT 0,
  duration TEXT,
  qa_status TEXT,
  sale_outcome TEXT,
  loss_reason TEXT,
  callback_needed BOOLEAN DEFAULT false,
  follow_up_owner TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_paid_qa TO authenticated;
GRANT ALL ON public.insurance_paid_qa TO service_role;
ALTER TABLE public.insurance_paid_qa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_qa_select" ON public.insurance_paid_qa FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_qa_write" ON public.insurance_paid_qa FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_qa_update" ON public.insurance_paid_qa FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_qa_delete" ON public.insurance_paid_qa FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));

-- Agent daily summary
CREATE TABLE public.insurance_agent_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  entry_date DATE,
  week_start DATE,
  agent TEXT,
  shift_hours NUMERIC DEFAULT 0,
  manager_score NUMERIC,
  manager_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_agent_daily TO authenticated;
GRANT ALL ON public.insurance_agent_daily TO service_role;
ALTER TABLE public.insurance_agent_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_ad_select" ON public.insurance_agent_daily FOR SELECT TO authenticated USING (public.is_workspace_member(owner_id, auth.uid()));
CREATE POLICY "ins_ad_write" ON public.insurance_agent_daily FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_ad_update" ON public.insurance_agent_daily FOR UPDATE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));
CREATE POLICY "ins_ad_delete" ON public.insurance_agent_daily FOR DELETE TO authenticated USING (public.can_write_workspace(owner_id, auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_ins_agents_updated BEFORE UPDATE ON public.insurance_agents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ins_tiers_updated BEFORE UPDATE ON public.insurance_commission_tiers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ins_sales_updated BEFORE UPDATE ON public.insurance_sales FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ins_ct_updated BEFORE UPDATE ON public.insurance_calltools FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ins_rb_updated BEFORE UPDATE ON public.insurance_ringba FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ins_qa_updated BEFORE UPDATE ON public.insurance_paid_qa FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ins_ad_updated BEFORE UPDATE ON public.insurance_agent_daily FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

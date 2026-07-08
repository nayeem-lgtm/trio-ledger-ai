
-- Enums
DO $$ BEGIN
  CREATE TYPE payment_term AS ENUM ('daily','weekly','biweekly','monthly','quarterly','custom','on_receipt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft','sent','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PUBLISHERS
CREATE TABLE public.publishers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  payment_terms payment_term NOT NULL DEFAULT 'monthly',
  custom_days INT,
  default_amount NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  bank_details JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  default_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  default_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publishers TO authenticated;
GRANT ALL ON public.publishers TO service_role;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub select" ON public.publishers FOR SELECT USING (public.is_workspace_member(user_id, auth.uid()));
CREATE POLICY "pub insert" ON public.publishers FOR INSERT WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "pub update" ON public.publishers FOR UPDATE USING (public.can_write_workspace(user_id, auth.uid())) WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "pub delete" ON public.publishers FOR DELETE USING (public.can_write_workspace(user_id, auth.uid()));
CREATE TRIGGER trg_publishers_updated BEFORE UPDATE ON public.publishers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- BUYERS
CREATE TABLE public.buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms payment_term NOT NULL DEFAULT 'monthly',
  custom_days INT,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  default_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  default_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers TO authenticated;
GRANT ALL ON public.buyers TO service_role;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buy select" ON public.buyers FOR SELECT USING (public.is_workspace_member(user_id, auth.uid()));
CREATE POLICY "buy insert" ON public.buyers FOR INSERT WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "buy update" ON public.buyers FOR UPDATE USING (public.can_write_workspace(user_id, auth.uid())) WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "buy delete" ON public.buyers FOR DELETE USING (public.can_write_workspace(user_id, auth.uid()));
CREATE TRIGGER trg_buyers_updated BEFORE UPDATE ON public.buyers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- PUBLISHER PAYMENTS
CREATE TABLE public.publisher_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publisher_id UUID NOT NULL REFERENCES public.publishers(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  period_start DATE,
  period_end DATE,
  due_date DATE,
  payment_date DATE,
  status payment_status NOT NULL DEFAULT 'pending',
  reference TEXT,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publisher_payments TO authenticated;
GRANT ALL ON public.publisher_payments TO service_role;
ALTER TABLE public.publisher_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX pub_pay_pub_idx ON public.publisher_payments(publisher_id);
CREATE INDEX pub_pay_user_idx ON public.publisher_payments(user_id);
CREATE POLICY "pubp select" ON public.publisher_payments FOR SELECT USING (public.is_workspace_member(user_id, auth.uid()));
CREATE POLICY "pubp insert" ON public.publisher_payments FOR INSERT WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "pubp update" ON public.publisher_payments FOR UPDATE USING (public.can_write_workspace(user_id, auth.uid())) WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "pubp delete" ON public.publisher_payments FOR DELETE USING (public.can_write_workspace(user_id, auth.uid()));
CREATE TRIGGER trg_pubp_updated BEFORE UPDATE ON public.publisher_payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- BUYER RECEIPTS
CREATE TABLE public.buyer_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  period_start DATE,
  period_end DATE,
  expected_date DATE,
  received_date DATE,
  status payment_status NOT NULL DEFAULT 'pending',
  reference TEXT,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_receipts TO authenticated;
GRANT ALL ON public.buyer_receipts TO service_role;
ALTER TABLE public.buyer_receipts ENABLE ROW LEVEL SECURITY;
CREATE INDEX buy_rec_buy_idx ON public.buyer_receipts(buyer_id);
CREATE INDEX buy_rec_user_idx ON public.buyer_receipts(user_id);
CREATE POLICY "buyr select" ON public.buyer_receipts FOR SELECT USING (public.is_workspace_member(user_id, auth.uid()));
CREATE POLICY "buyr insert" ON public.buyer_receipts FOR INSERT WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "buyr update" ON public.buyer_receipts FOR UPDATE USING (public.can_write_workspace(user_id, auth.uid())) WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "buyr delete" ON public.buyer_receipts FOR DELETE USING (public.can_write_workspace(user_id, auth.uid()));
CREATE TRIGGER trg_buyr_updated BEFORE UPDATE ON public.buyer_receipts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- INVOICES
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status invoice_status NOT NULL DEFAULT 'draft',
  template TEXT NOT NULL DEFAULT 'classic',
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  bank_details JSONB DEFAULT '{}'::jsonb,
  payment_link TEXT,
  sender JSONB DEFAULT '{}'::jsonb,
  receiver JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX inv_user_idx ON public.invoices(user_id);
CREATE INDEX inv_buyer_idx ON public.invoices(buyer_id);
CREATE POLICY "inv select" ON public.invoices FOR SELECT USING (public.is_workspace_member(user_id, auth.uid()));
CREATE POLICY "inv insert" ON public.invoices FOR INSERT WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "inv update" ON public.invoices FOR UPDATE USING (public.can_write_workspace(user_id, auth.uid())) WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "inv delete" ON public.invoices FOR DELETE USING (public.can_write_workspace(user_id, auth.uid()));
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- INVOICE ITEMS
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  service_start DATE,
  service_end DATE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX inv_items_inv_idx ON public.invoice_items(invoice_id);
CREATE POLICY "invit select" ON public.invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_workspace_member(i.user_id, auth.uid()))
);
CREATE POLICY "invit insert" ON public.invoice_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_write_workspace(i.user_id, auth.uid()))
);
CREATE POLICY "invit update" ON public.invoice_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_write_workspace(i.user_id, auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_write_workspace(i.user_id, auth.uid()))
);
CREATE POLICY "invit delete" ON public.invoice_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_write_workspace(i.user_id, auth.uid()))
);

-- SMTP SETTINGS (per user)
CREATE TABLE public.smtp_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  port INT NOT NULL DEFAULT 587,
  secure BOOLEAN NOT NULL DEFAULT FALSE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  reply_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smtp_settings TO authenticated;
GRANT ALL ON public.smtp_settings TO service_role;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smtp own" ON public.smtp_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_smtp_updated BEFORE UPDATE ON public.smtp_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

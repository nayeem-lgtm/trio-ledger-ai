
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Businesses
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own businesses" ON public.businesses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.businesses(user_id);

-- Categories
CREATE TYPE public.txn_type AS ENUM ('income', 'expense');

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.txn_type NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.categories(user_id);
CREATE INDEX ON public.categories(business_id);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type public.txn_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  vendor TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.transactions(user_id);
CREATE INDEX ON public.transactions(business_id);
CREATE INDEX ON public.transactions(transaction_date);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile + seed businesses + default categories on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  b_affiliate UUID;
  b_ecom UUID;
  b_insurance UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.businesses (user_id, name, type, color, icon)
  VALUES (NEW.id, 'Affiliate', 'affiliate', '#6366f1', 'Link') RETURNING id INTO b_affiliate;
  INSERT INTO public.businesses (user_id, name, type, color, icon)
  VALUES (NEW.id, 'Ecommerce', 'ecommerce', '#10b981', 'ShoppingBag') RETURNING id INTO b_ecom;
  INSERT INTO public.businesses (user_id, name, type, color, icon)
  VALUES (NEW.id, 'Insurance', 'insurance', '#f59e0b', 'Shield') RETURNING id INTO b_insurance;

  -- Shared default expense categories (business_id NULL)
  INSERT INTO public.categories (user_id, business_id, name, type, color) VALUES
    (NEW.id, NULL, 'Salaries', 'expense', '#ef4444'),
    (NEW.id, NULL, 'Software', 'expense', '#8b5cf6'),
    (NEW.id, NULL, 'Supplies', 'expense', '#f97316'),
    (NEW.id, NULL, 'Utilities', 'expense', '#0ea5e9'),
    (NEW.id, NULL, 'Office Expense', 'expense', '#14b8a6'),
    (NEW.id, NULL, 'Marketing', 'expense', '#ec4899'),
    (NEW.id, NULL, 'Travel', 'expense', '#a855f7'),
    (NEW.id, NULL, 'Taxes', 'expense', '#dc2626'),
    (NEW.id, NULL, 'Bank Fees', 'expense', '#64748b'),
    (NEW.id, NULL, 'Other Expense', 'expense', '#71717a'),
    (NEW.id, NULL, 'Sales Revenue', 'income', '#16a34a'),
    (NEW.id, NULL, 'Commissions', 'income', '#22c55e'),
    (NEW.id, NULL, 'Other Income', 'income', '#84cc16');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

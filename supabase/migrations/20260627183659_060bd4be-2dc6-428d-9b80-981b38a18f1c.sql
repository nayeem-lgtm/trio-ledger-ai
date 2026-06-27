
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

-- Update handle_new_user to persist the email going forward (without changing other behavior)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b_affiliate UUID;
  b_ecom UUID;
  b_insurance UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Only seed default businesses & categories for users with no pending invites
  IF NOT EXISTS (SELECT 1 FROM public.team_invites WHERE lower(email) = lower(NEW.email) AND status = 'pending') THEN
    INSERT INTO public.businesses (user_id, name, type, color, icon)
    VALUES (NEW.id, 'Affiliate', 'affiliate', '#6366f1', 'Link') RETURNING id INTO b_affiliate;
    INSERT INTO public.businesses (user_id, name, type, color, icon)
    VALUES (NEW.id, 'Ecommerce', 'ecommerce', '#10b981', 'ShoppingBag') RETURNING id INTO b_ecom;
    INSERT INTO public.businesses (user_id, name, type, color, icon)
    VALUES (NEW.id, 'Insurance', 'insurance', '#f59e0b', 'Shield') RETURNING id INTO b_insurance;

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
  END IF;
  RETURN NEW;
END;
$$;

-- Let team members see the OWNER's profile (name/email) so the UI can label the workspace.
-- Also let owners see their team members' profiles.
DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "profile visible to self, owners, and members" ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE (tm.owner_id = id AND tm.member_user_id = auth.uid())
       OR (tm.member_user_id = id AND tm.owner_id = auth.uid())
  )
);

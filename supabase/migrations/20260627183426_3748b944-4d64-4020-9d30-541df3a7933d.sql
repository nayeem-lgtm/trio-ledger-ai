
CREATE TYPE public.team_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, member_user_id)
);

CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.team_role NOT NULL DEFAULT 'editor',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_members TO service_role;
GRANT ALL ON public.team_invites TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_owner UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = _user OR EXISTS (
    SELECT 1 FROM public.team_members WHERE owner_id = _owner AND member_user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_workspace(_owner UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = _user OR EXISTS (
    SELECT 1 FROM public.team_members
    WHERE owner_id = _owner AND member_user_id = _user AND role IN ('admin','editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_admin_workspace(_owner UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = _user OR EXISTS (
    SELECT 1 FROM public.team_members
    WHERE owner_id = _owner AND member_user_id = _user AND role = 'admin'
  );
$$;

-- team_members policies
CREATE POLICY "team members visible to owner or member" ON public.team_members FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = member_user_id);
CREATE POLICY "owners insert team" ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owners update team" ON public.team_members FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owners or self delete" ON public.team_members FOR DELETE
  USING (auth.uid() = owner_id OR auth.uid() = member_user_id);

-- team_invites policies (owner-only)
CREATE POLICY "owners manage invites" ON public.team_invites FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Replace existing single-policy ALL on businesses/categories/transactions
DROP POLICY IF EXISTS "own businesses" ON public.businesses;
DROP POLICY IF EXISTS "own categories" ON public.categories;
DROP POLICY IF EXISTS "own transactions" ON public.transactions;

-- businesses (admin-only writes for clarity; owner is always admin)
CREATE POLICY "biz select" ON public.businesses FOR SELECT
  USING (public.is_workspace_member(user_id, auth.uid()));
CREATE POLICY "biz insert" ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "biz update" ON public.businesses FOR UPDATE
  USING (public.can_admin_workspace(user_id, auth.uid()))
  WITH CHECK (public.can_admin_workspace(user_id, auth.uid()));
CREATE POLICY "biz delete" ON public.businesses FOR DELETE
  USING (auth.uid() = user_id);

-- categories
CREATE POLICY "cat select" ON public.categories FOR SELECT
  USING (public.is_workspace_member(user_id, auth.uid()));
CREATE POLICY "cat insert" ON public.categories FOR INSERT
  WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "cat update" ON public.categories FOR UPDATE
  USING (public.can_write_workspace(user_id, auth.uid()))
  WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "cat delete" ON public.categories FOR DELETE
  USING (public.can_write_workspace(user_id, auth.uid()));

-- transactions
CREATE POLICY "tx select" ON public.transactions FOR SELECT
  USING (public.is_workspace_member(user_id, auth.uid()));
CREATE POLICY "tx insert" ON public.transactions FOR INSERT
  WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "tx update" ON public.transactions FOR UPDATE
  USING (public.can_write_workspace(user_id, auth.uid()))
  WITH CHECK (public.can_write_workspace(user_id, auth.uid()));
CREATE POLICY "tx delete" ON public.transactions FOR DELETE
  USING (public.can_write_workspace(user_id, auth.uid()));

-- Auto-accept pending invites when a new auth.users row is created
CREATE OR REPLACE FUNCTION public.accept_pending_invites_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.team_members (owner_id, member_user_id, role)
  SELECT owner_id, NEW.id, role FROM public.team_invites
  WHERE lower(email) = lower(NEW.email) AND status = 'pending'
  ON CONFLICT (owner_id, member_user_id) DO NOTHING;

  UPDATE public.team_invites SET status = 'accepted'
  WHERE lower(email) = lower(NEW.email) AND status = 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_accept_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_accept_invites
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.accept_pending_invites_on_signup();

-- Also expose a callable function so existing signed-in users can accept new invites
CREATE OR REPLACE FUNCTION public.accept_my_pending_invites()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  my_email TEXT;
  accepted INTEGER;
BEGIN
  SELECT email INTO my_email FROM auth.users WHERE id = auth.uid();
  IF my_email IS NULL THEN RETURN 0; END IF;

  INSERT INTO public.team_members (owner_id, member_user_id, role)
  SELECT owner_id, auth.uid(), role FROM public.team_invites
  WHERE lower(email) = lower(my_email) AND status = 'pending'
  ON CONFLICT (owner_id, member_user_id) DO NOTHING;
  GET DIAGNOSTICS accepted = ROW_COUNT;

  UPDATE public.team_invites SET status = 'accepted'
  WHERE lower(email) = lower(my_email) AND status = 'pending';

  RETURN accepted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_my_pending_invites() TO authenticated;

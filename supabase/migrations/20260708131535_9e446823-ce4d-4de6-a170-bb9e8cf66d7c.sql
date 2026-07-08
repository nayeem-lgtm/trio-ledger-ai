
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  is_default boolean not null default true,
  logo_url text,
  signature_url text,
  brand_color text default '#0f172a',
  accent_color text default '#3b82f6',
  text_color text default '#0f172a',
  muted_color text default '#64748b',
  heading_font text default 'Inter',
  body_font text default 'Inter',
  page_size text default 'A4',
  watermark_text text,
  tagline text,
  company_name text,
  company_address text,
  company_email text,
  company_phone text,
  company_website text,
  company_tax_id text,
  footer_text text,
  default_notes text,
  default_terms text,
  default_email_subject text,
  default_email_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.brand_kits to authenticated;
grant all on public.brand_kits to service_role;

alter table public.brand_kits enable row level security;

create policy "own brand kits" on public.brand_kits for all
to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger brand_kits_updated_at before update on public.brand_kits
for each row execute function public.set_updated_at();

alter table public.invoices
  add column if not exists brand_kit_id uuid references public.brand_kits(id) on delete set null,
  add column if not exists custom_fields jsonb not null default '[]'::jsonb,
  add column if not exists blocks jsonb not null default '{}'::jsonb,
  add column if not exists po_number text,
  add column if not exists project_code text,
  add column if not exists cc_emails text[] not null default '{}',
  add column if not exists bcc_emails text[] not null default '{}',
  add column if not exists email_subject text,
  add column if not exists email_body text;

alter table public.invoice_items
  add column if not exists item_tax_rate numeric not null default 0,
  add column if not exists item_discount numeric not null default 0;

create table if not exists public.organization_settings (
  admin_id uuid primary key references public.profiles(id) on delete cascade,
  organization_name text not null default '' check (char_length(organization_name) <= 160),
  website text not null default '' check (char_length(website) <= 300),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  date_format text not null default 'DD MMM YYYY' check (date_format in ('DD MMM YYYY','DD/MM/YYYY','YYYY-MM-DD')),
  page_size text not null default 'A4 Landscape' check (page_size in ('A4 Landscape','A4 Portrait')),
  updated_at timestamptz not null default now()
);
alter table public.organization_settings enable row level security;
create policy "Admins manage their own organization settings"
on public.organization_settings for all to authenticated
using (admin_id = (select auth.uid()))
with check (admin_id = (select auth.uid()));

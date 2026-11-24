create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'super_admin');
create type public.certificate_status as enum ('valid', 'revoked');
create type public.generation_job_status as enum ('queued', 'processing', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'admin'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'super_admin'
  );
$$;

create table public.event_folders (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, admin_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  folder_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 180),
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, admin_id),
  constraint events_folder_owner_fk
    foreign key (folder_id, admin_id)
    references public.event_folders(id, admin_id) on delete set null (folder_id)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null,
  full_name text not null check (char_length(trim(full_name)) between 1 and 180),
  email text,
  external_ref text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, admin_id),
  foreign key (event_id, admin_id)
    references public.events(id, admin_id) on delete cascade
);
create index participants_event_idx on public.participants(admin_id, event_id);
create index participants_name_idx on public.participants(admin_id, lower(full_name));

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  background_path text not null,
  background_mime text not null check (background_mime in ('application/pdf', 'image/png', 'image/jpeg')),
  layout_json jsonb not null default '{"version":1,"fields":[]}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, admin_id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null,
  participant_id uuid not null,
  template_id uuid,
  certificate_id text not null unique check (char_length(trim(certificate_id)) between 4 and 100),
  issue_date date not null default current_date,
  achievement_title text,
  status public.certificate_status not null default 'valid',
  template_version integer,
  layout_snapshot jsonb,
  participant_snapshot jsonb not null,
  pdf_storage_path text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  unique (id, admin_id),
  foreign key (event_id, admin_id)
    references public.events(id, admin_id) on delete restrict,
  foreign key (participant_id, admin_id)
    references public.participants(id, admin_id) on delete restrict,
  foreign key (template_id, admin_id)
    references public.templates(id, admin_id) on delete set null (template_id)
);
create index certificates_admin_event_idx on public.certificates(admin_id, event_id);
create index certificates_participant_idx on public.certificates(admin_id, participant_id);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null,
  status public.generation_job_status not null default 'queued',
  source_filename text,
  total_rows integer not null default 0 check (total_rows >= 0),
  succeeded_rows integer not null default 0 check (succeeded_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  results jsonb not null default '[]'::jsonb,
  output_zip_path text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (event_id, admin_id)
    references public.events(id, admin_id) on delete cascade
);
create index generation_jobs_admin_created_idx on public.generation_jobs(admin_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_admin_created_idx on public.audit_logs(admin_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.event_folders enable row level security;
alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.templates enable row level security;
alter table public.certificates enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy "Profiles are visible to self and super admins"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Admins manage their own folders"
on public.event_folders for all to authenticated
using (admin_id = (select auth.uid()) or (select public.is_super_admin()))
with check (admin_id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Admins manage their own events"
on public.events for all to authenticated
using (admin_id = (select auth.uid()) or (select public.is_super_admin()))
with check (admin_id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Admins manage their own participants"
on public.participants for all to authenticated
using (admin_id = (select auth.uid()) or (select public.is_super_admin()))
with check (admin_id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Admins manage their own templates"
on public.templates for all to authenticated
using (admin_id = (select auth.uid()) or (select public.is_super_admin()))
with check (admin_id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Admins manage their own certificates"
on public.certificates for all to authenticated
using (admin_id = (select auth.uid()) or (select public.is_super_admin()))
with check (admin_id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Admins manage their own generation jobs"
on public.generation_jobs for all to authenticated
using (admin_id = (select auth.uid()) or (select public.is_super_admin()))
with check (admin_id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Admins can read their own audit logs"
on public.audit_logs for select to authenticated
using (admin_id = (select auth.uid()) or (select public.is_super_admin()));

comment on table public.certificates is
  'Issued certificate records. certificate_id is globally unique; re-rendering must reuse this issuance.';
comment on column public.certificates.participant_snapshot is
  'Minimal issuance-time participant data used to preserve the issued certificate record.';
comment on column public.templates.layout_json is
  'Versioned visual layout definition used by the certificate renderer.';

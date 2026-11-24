-- Increase certificate identifier entropy and preserve source assets referenced by templates or issued records.
-- Also add audit coverage for organisation settings, role changes and certificate revocations.

create or replace function public.issue_certificate(
  target_event_id uuid,
  target_participant_id uuid,
  target_template_id uuid,
  target_achievement_title text,
  request_key text
)
returns table(id uuid, certificate_id text, status public.certificate_status, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  event_name text;
  participant_data jsonb;
  existing public.certificates%rowtype;
  new_id text;
  inserted public.certificates%rowtype;
  selected_template_version integer;
  selected_layout jsonb;
  selected_background_path text;
  selected_background_mime text;
  frozen_layout jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if request_key is null or char_length(trim(request_key)) not between 8 and 120 then
    raise exception 'A valid idempotency key is required';
  end if;

  select c.* into existing
  from public.certificates c
  where c.admin_id = caller
    and (c.idempotency_key = trim(request_key)
      or (c.event_id = target_event_id and c.participant_id = target_participant_id))
  order by (c.idempotency_key = trim(request_key)) desc
  limit 1;

  if found then
    if existing.event_id <> target_event_id or existing.participant_id <> target_participant_id then
      raise exception 'This request key has already been used for another certificate';
    end if;
    return query select existing.id, existing.certificate_id, existing.status, false;
    return;
  end if;

  select e.name into event_name
  from public.events e
  where e.id = target_event_id and e.admin_id = caller;
  if event_name is null then raise exception 'Event not found'; end if;

  select jsonb_build_object('full_name', p.full_name, 'email', p.email, 'external_ref', p.external_ref)
  into participant_data
  from public.participants p
  where p.id = target_participant_id
    and p.event_id = target_event_id
    and p.admin_id = caller;
  if participant_data is null then raise exception 'Participant not found in this event'; end if;

  if target_template_id is not null then
    select t.version, t.layout_json, t.background_path, t.background_mime
    into selected_template_version, selected_layout, selected_background_path, selected_background_mime
    from public.templates t
    where t.id = target_template_id and t.admin_id = caller;
    if not found then raise exception 'Template not found'; end if;
    frozen_layout := jsonb_build_object(
      'template_version', selected_template_version,
      'layout_json', selected_layout,
      'background_path', selected_background_path,
      'background_mime', selected_background_mime
    );
  else
    frozen_layout := null;
  end if;

  -- 128-bit random suffix: substantially stronger collision resistance than the original 48-bit suffix.
  new_id := 'CERT-' || to_char(current_date, 'YYYYMMDD') || '-' ||
    upper(encode(gen_random_bytes(16), 'hex'));

  insert into public.certificates(
    admin_id, event_id, participant_id, template_id, certificate_id,
    achievement_title, participant_snapshot, idempotency_key,
    template_version, layout_snapshot
  )
  values (
    caller, target_event_id, target_participant_id, target_template_id, new_id,
    nullif(trim(target_achievement_title), ''), participant_data, trim(request_key),
    selected_template_version, frozen_layout
  )
  on conflict do nothing
  returning * into inserted;

  if inserted.id is null then
    select c.* into inserted
    from public.certificates c
    where c.admin_id = caller
      and (c.idempotency_key = trim(request_key)
        or (c.event_id = target_event_id and c.participant_id = target_participant_id))
    limit 1;
    if inserted.id is null then raise exception 'Certificate could not be issued; please retry'; end if;
    if inserted.event_id <> target_event_id or inserted.participant_id <> target_participant_id then
      raise exception 'This request key has already been used for another certificate';
    end if;
    return query select inserted.id, inserted.certificate_id, inserted.status, false;
  else
    return query select inserted.id, inserted.certificate_id, inserted.status, true;
  end if;
end;
$$;

revoke all on function public.issue_certificate(uuid, uuid, uuid, text, text) from public;
grant execute on function public.issue_certificate(uuid, uuid, uuid, text, text) to authenticated;

-- Keep template objects private and allow deletion only after no template or issued snapshot references them.
drop policy if exists "Admins manage own template assets" on storage.objects;
create policy "Admins read own template assets"
on storage.objects for select to authenticated
using (bucket_id = 'certificate-templates' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Admins upload own template assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'certificate-templates' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Admins delete unreferenced template assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'certificate-templates'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1 from public.templates t
    where t.admin_id = (select auth.uid()) and t.background_path = storage.objects.name
  )
  and not exists (
    select 1 from public.certificates c
    where c.admin_id = (select auth.uid())
      and c.layout_snapshot ->> 'background_path' = storage.objects.name
  )
);

-- Audit organisation setting changes through the existing tenant audit trigger.
drop trigger if exists audit_organization_settings on public.organization_settings;
create trigger audit_organization_settings
after insert or update or delete on public.organization_settings
for each row execute function public.write_audit_log();

-- Record administrator role transitions, including who performed them.
create or replace function public.audit_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role is distinct from new.role then
    insert into public.audit_logs(admin_id, actor_id, action, resource_type, resource_id, metadata)
    values (
      new.id,
      auth.uid(),
      'role_changed',
      'profile',
      new.id::text,
      jsonb_build_object('old_role', old.role, 'new_role', new.role)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_profile_role_changes on public.profiles;
create trigger audit_profile_role_changes
after update of role on public.profiles
for each row execute function public.audit_profile_role_change();

-- Capture the reason for certificate revocation in the audit trail.
create or replace function public.audit_certificate_revocation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'revoked' then
    insert into public.audit_logs(admin_id, actor_id, action, resource_type, resource_id, metadata)
    values (
      new.admin_id,
      auth.uid(),
      'revoked',
      'certificate',
      new.id::text,
      jsonb_build_object('certificate_id', new.certificate_id, 'reason', new.revoked_reason)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_certificate_revocations on public.certificates;
create trigger audit_certificate_revocations
after update of status on public.certificates
for each row execute function public.audit_certificate_revocation();

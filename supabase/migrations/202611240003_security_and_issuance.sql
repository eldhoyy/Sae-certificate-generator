-- Security hardening and transaction-safe certificate issuance.
-- Run after 001 and 002. Existing admin_id ownership remains the tenant boundary.

create index if not exists certificates_lookup_idx on public.certificates(certificate_id);
create index if not exists events_admin_created_idx on public.events(admin_id, created_at desc);
create index if not exists folders_admin_created_idx on public.event_folders(admin_id, created_at desc);
create index if not exists templates_admin_created_idx on public.templates(admin_id, created_at desc);

-- Keep profile metadata editable without exposing role changes to normal users.
create or replace function public.update_my_profile(new_display_name text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if new_display_name is null or char_length(trim(new_display_name)) not between 1 and 120 then
    raise exception 'Display name must be between 1 and 120 characters';
  end if;
  update public.profiles set display_name=trim(new_display_name), updated_at=now()
  where id=auth.uid();
end;
$$;
revoke all on function public.update_my_profile(text) from public;
grant execute on function public.update_my_profile(text) to authenticated;

-- Super Admin-only account administration. The role is never writable by a tenant admin.
create or replace function public.super_admin_list_profiles()
returns table(id uuid, display_name text, role public.app_role, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce((select public.is_super_admin()),false) then raise exception 'Super Admin access required'; end if;
  return query select p.id,p.display_name,p.role,p.created_at from public.profiles p order by p.created_at desc;
end;
$$;
revoke all on function public.super_admin_list_profiles() from public;
grant execute on function public.super_admin_list_profiles() to authenticated;

create or replace function public.super_admin_set_role(target_user_id uuid, new_role public.app_role)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce((select public.is_super_admin()),false) then raise exception 'Super Admin access required'; end if;
  if target_user_id=(select auth.uid()) and new_role <> 'super_admin' then
    raise exception 'You cannot remove your own Super Admin role';
  end if;
  update public.profiles set role=new_role, updated_at=now() where id=target_user_id;
  if not found then raise exception 'Administrator not found'; end if;
end;
$$;
revoke all on function public.super_admin_set_role(uuid,public.app_role) from public;
grant execute on function public.super_admin_set_role(uuid,public.app_role) to authenticated;

-- Safe issuance: caller must own the event and participant. Repeating an idempotency key
-- returns the original issuance instead of creating a second certificate.
alter table public.certificates add column if not exists idempotency_key text;
create unique index if not exists certificates_idempotency_key_uq
  on public.certificates(admin_id,idempotency_key) where idempotency_key is not null;

create or replace function public.issue_certificate(
  target_event_id uuid,
  target_participant_id uuid,
  target_template_id uuid,
  target_achievement_title text,
  request_key text
)
returns table(id uuid, certificate_id text, status public.certificate_status, created boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  event_name text;
  participant_data jsonb;
  existing public.certificates%rowtype;
  new_id text;
  inserted public.certificates%rowtype;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if request_key is null or char_length(trim(request_key)) not between 8 and 120 then
    raise exception 'A valid idempotency key is required';
  end if;

  select c.* into existing from public.certificates c
    where c.admin_id=caller and c.idempotency_key=trim(request_key);
  if found then return query select existing.id,existing.certificate_id,existing.status,false; return; end if;

  select e.name into event_name from public.events e
    where e.id=target_event_id and e.admin_id=caller;
  if event_name is null then raise exception 'Event not found'; end if;

  select jsonb_build_object('full_name',p.full_name,'email',p.email,'external_ref',p.external_ref)
    into participant_data
    from public.participants p where p.id=target_participant_id
      and p.event_id=target_event_id and p.admin_id=caller;
  if participant_data is null then raise exception 'Participant not found in this event'; end if;

  if target_template_id is not null and not exists(
    select 1 from public.templates t where t.id=target_template_id and t.admin_id=caller
  ) then raise exception 'Template not found'; end if;

  new_id := 'CERT-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,12));
  insert into public.certificates(admin_id,event_id,participant_id,template_id,certificate_id,
    achievement_title,participant_snapshot,idempotency_key)
  values(caller,target_event_id,target_participant_id,target_template_id,new_id,
    nullif(trim(target_achievement_title),''),participant_data,trim(request_key))
  on conflict (admin_id,idempotency_key) where idempotency_key is not null do nothing
  returning * into inserted;

  if inserted.id is null then
    select c.* into inserted from public.certificates c
      where c.admin_id=caller and c.idempotency_key=trim(request_key);
    return query select inserted.id,inserted.certificate_id,inserted.status,false;
  else
    return query select inserted.id,inserted.certificate_id,inserted.status,true;
  end if;
end;
$$;
revoke all on function public.issue_certificate(uuid,uuid,uuid,text,text) from public;
grant execute on function public.issue_certificate(uuid,uuid,uuid,text,text) to authenticated;

-- Revocation is a status change, never deletion or replacement of the original ID.
create or replace function public.revoke_certificate(target_certificate_id uuid, reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if reason is null or char_length(trim(reason)) not between 3 and 500 then
    raise exception 'A revocation reason is required';
  end if;
  update public.certificates set status='revoked',revoked_at=now(),revoked_reason=trim(reason)
    where id=target_certificate_id and admin_id=auth.uid() and status='valid';
  if not found then raise exception 'Certificate not found or already revoked'; end if;
end;
$$;
revoke all on function public.revoke_certificate(uuid,text) from public;
grant execute on function public.revoke_certificate(uuid,text) to authenticated;

-- Only minimal, explicitly selected data is exposed by public verification.
create or replace function public.public_verify_certificate(lookup_id text)
returns table(certificate_id text,participant_name text,event_name text,issue_date date,achievement_title text,status public.certificate_status)
language sql stable security definer set search_path=''
as $$
 select c.certificate_id,
        coalesce(c.participant_snapshot->>'full_name',''),
        e.name,c.issue_date,c.achievement_title,c.status
 from public.certificates c
 join public.events e on e.id=c.event_id and e.admin_id=c.admin_id
 where c.certificate_id=trim(lookup_id)
 limit 1;
$$;
revoke all on function public.public_verify_certificate(text) from public;
grant execute on function public.public_verify_certificate(text) to anon,authenticated;

-- Audit events are generated inside the database for core record changes.
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  tenant_id uuid;
  resource text;
  record_id text;
begin
  tenant_id := coalesce((to_jsonb(new)->>'admin_id')::uuid,(to_jsonb(old)->>'admin_id')::uuid);
  resource := tg_table_name;
  record_id := coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id');
  if tenant_id is not null then
    insert into public.audit_logs(admin_id,actor_id,action,resource_type,resource_id)
    values(tenant_id,auth.uid(),lower(tg_op),resource,record_id);
  end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists audit_folders on public.event_folders;
create trigger audit_folders after insert or update or delete on public.event_folders
for each row execute function public.write_audit_log();
drop trigger if exists audit_events on public.events;
create trigger audit_events after insert or update or delete on public.events
for each row execute function public.write_audit_log();
drop trigger if exists audit_participants on public.participants;
create trigger audit_participants after insert or update or delete on public.participants
for each row execute function public.write_audit_log();
drop trigger if exists audit_templates on public.templates;
create trigger audit_templates after insert or update or delete on public.templates
for each row execute function public.write_audit_log();
drop trigger if exists audit_certificates on public.certificates;
create trigger audit_certificates after insert or update or delete on public.certificates
for each row execute function public.write_audit_log();


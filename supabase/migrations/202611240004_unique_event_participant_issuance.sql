-- Prevent duplicate certificate issuance for the same participant in the same event.
-- Repeated requests (even with a fresh idempotency key) return the original issuance.
create unique index if not exists certificates_one_per_participant_event_uq
  on public.certificates(admin_id, event_id, participant_id);

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

  if target_template_id is not null and not exists (
    select 1 from public.templates t where t.id = target_template_id and t.admin_id = caller
  ) then raise exception 'Template not found'; end if;

  new_id := 'CERT-' || to_char(current_date, 'YYYYMMDD') || '-' ||
    upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));

  insert into public.certificates(
    admin_id, event_id, participant_id, template_id, certificate_id,
    achievement_title, participant_snapshot, idempotency_key
  )
  values (
    caller, target_event_id, target_participant_id, target_template_id, new_id,
    nullif(trim(target_achievement_title), ''), participant_data, trim(request_key)
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

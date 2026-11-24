-- Bound public verification lookups and retain the deliberately limited response shape.
create or replace function public.public_verify_certificate(lookup_id text)
returns table(
  certificate_id text,
  participant_name text,
  event_name text,
  issue_date date,
  achievement_title text,
  status public.certificate_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if lookup_id is null or char_length(trim(lookup_id)) not between 4 and 100 then
    return;
  end if;

  return query
  select
    c.certificate_id,
    coalesce(c.participant_snapshot ->> 'full_name', ''),
    e.name,
    c.issue_date,
    c.achievement_title,
    c.status
  from public.certificates c
  join public.events e on e.id = c.event_id and e.admin_id = c.admin_id
  where c.certificate_id = trim(lookup_id)
  limit 1;
end;
$$;

revoke all on function public.public_verify_certificate(text) from public;
grant execute on function public.public_verify_certificate(text) to anon, authenticated;

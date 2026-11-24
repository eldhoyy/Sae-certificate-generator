-- Retry failed queue rows and make public verification use the immutable event snapshot.
create or replace function public.retry_generation_job(target_job_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare caller uuid:=auth.uid(); retried_count integer;
begin
 if caller is null then raise exception 'Authentication required'; end if;
 update public.generation_job_items i set status='queued',error_message=null,completed_at=null
 where i.job_id=target_job_id and i.admin_id=caller and i.status='failed';
 get diagnostics retried_count = row_count;
 if retried_count=0 then raise exception 'No failed rows are available to retry'; end if;
 update public.generation_jobs j set status='queued',failed_rows=0,completed_at=null
 where j.id=target_job_id and j.admin_id=caller;
 if not found then raise exception 'Generation job not found'; end if;
 return retried_count;
end;
$$;
revoke all on function public.retry_generation_job(uuid) from public;
grant execute on function public.retry_generation_job(uuid) to authenticated;

create or replace function public.public_verify_certificate(lookup_id text)
returns table(certificate_id text,participant_name text,event_name text,issue_date date,achievement_title text,status public.certificate_status)
language sql stable security definer set search_path=''
as $$
 select c.certificate_id,coalesce(c.participant_snapshot->>'full_name',''),
 coalesce(c.participant_snapshot->>'event_name',e.name),c.issue_date,c.achievement_title,c.status
 from public.certificates c join public.events e on e.id=c.event_id and e.admin_id=c.admin_id
 where char_length(trim(lookup_id)) between 1 and 100 and c.certificate_id=trim(lookup_id) limit 1;
$$;
revoke all on function public.public_verify_certificate(text) from public;
grant execute on function public.public_verify_certificate(text) to anon,authenticated;

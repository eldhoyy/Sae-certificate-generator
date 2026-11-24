-- Durable, tenant-isolated certificate generation queue.
-- Only the service-role worker may mutate queue state.

alter table public.generation_jobs
  add column if not exists template_id uuid,
  add constraint generation_jobs_id_admin_uq unique (id, admin_id);
alter table public.generation_jobs
  add constraint generation_jobs_template_owner_fk
  foreign key (template_id, admin_id) references public.templates(id, admin_id) on delete set null (template_id);

create table public.generation_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  participant_id uuid not null,
  status text not null default 'queued' check (status in ('queued','completed','failed')),
  certificate_id text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (job_id, admin_id) references public.generation_jobs(id, admin_id) on delete cascade,
  foreign key (participant_id, admin_id) references public.participants(id, admin_id) on delete restrict,
  unique (job_id, participant_id)
);
create index generation_job_items_queue_idx on public.generation_job_items(status, created_at);
create index generation_job_items_job_idx on public.generation_job_items(admin_id, job_id, status);
alter table public.generation_job_items enable row level security;

drop policy if exists "Admins manage their own generation jobs" on public.generation_jobs;
create policy "Admins read their own generation jobs" on public.generation_jobs for select to authenticated
using (admin_id = (select auth.uid()));
create policy "Admins read their own generation job items" on public.generation_job_items for select to authenticated
using (admin_id = (select auth.uid()));

create or replace function public.enqueue_certificate_generation(target_event_id uuid,target_template_id uuid,target_participant_ids uuid[])
returns uuid language plpgsql security definer set search_path=''
as $$
declare caller uuid:=auth.uid(); job_id uuid; matched_count integer; unique_count integer;
begin
 if caller is null then raise exception 'Authentication required'; end if;
 if target_participant_ids is null or cardinality(target_participant_ids) not between 1 and 5000 then raise exception 'Choose between 1 and 5,000 participants'; end if;
 select count(distinct participant_id) into unique_count from unnest(target_participant_ids) as ids(participant_id);
 if unique_count<>cardinality(target_participant_ids) then raise exception 'Duplicate participants in generation request'; end if;
 if not exists(select 1 from public.events e where e.id=target_event_id and e.admin_id=caller) then raise exception 'Event not found'; end if;
 if target_template_id is not null and not exists(select 1 from public.templates t where t.id=target_template_id and t.admin_id=caller) then raise exception 'Template not found'; end if;
 select count(*) into matched_count from public.participants p where p.admin_id=caller and p.event_id=target_event_id and p.id=any(target_participant_ids);
 if matched_count<>cardinality(target_participant_ids) then raise exception 'One or more selected participants do not belong to this event'; end if;
 insert into public.generation_jobs(admin_id,event_id,template_id,status,total_rows)
 values(caller,target_event_id,target_template_id,'queued',cardinality(target_participant_ids)) returning id into job_id;
 insert into public.generation_job_items(job_id,admin_id,participant_id)
 select job_id,caller,p.id from public.participants p where p.admin_id=caller and p.event_id=target_event_id and p.id=any(target_participant_ids);
 return job_id;
end;
$$;
revoke all on function public.enqueue_certificate_generation(uuid,uuid,uuid[]) from public;
grant execute on function public.enqueue_certificate_generation(uuid,uuid,uuid[]) to authenticated;

-- Issue snapshots retain event name, participant custom fields and selected template asset/layout.
create or replace function public.issue_certificate(target_event_id uuid,target_participant_id uuid,target_template_id uuid,target_achievement_title text,request_key text)
returns table(id uuid,certificate_id text,status public.certificate_status,created boolean)
language plpgsql security definer set search_path=''
as $$
declare caller uuid:=auth.uid(); event_name text; participant_data jsonb; existing public.certificates%rowtype;
 new_id text; inserted public.certificates%rowtype; selected_template_version integer; selected_layout jsonb;
 selected_background_path text; selected_background_mime text; frozen_layout jsonb;
begin
 if caller is null then raise exception 'Authentication required'; end if;
 if request_key is null or char_length(trim(request_key)) not between 8 and 120 then raise exception 'A valid idempotency key is required'; end if;
 if target_achievement_title is not null and char_length(trim(target_achievement_title))>180 then raise exception 'Achievement title is too long'; end if;
 select c.* into existing from public.certificates c where c.admin_id=caller and
 (c.idempotency_key=trim(request_key) or (c.event_id=target_event_id and c.participant_id=target_participant_id))
 order by (c.idempotency_key=trim(request_key)) desc limit 1;
 if found then
  if existing.event_id<>target_event_id or existing.participant_id<>target_participant_id then raise exception 'This request key has already been used for another certificate'; end if;
  return query select existing.id,existing.certificate_id,existing.status,false; return;
 end if;
 select e.name into event_name from public.events e where e.id=target_event_id and e.admin_id=caller;
 if event_name is null then raise exception 'Event not found'; end if;
 select jsonb_build_object('full_name',p.full_name,'email',p.email,'external_ref',p.external_ref,'custom_fields',p.custom_fields,'event_name',event_name)
 into participant_data from public.participants p where p.id=target_participant_id and p.event_id=target_event_id and p.admin_id=caller;
 if participant_data is null then raise exception 'Participant not found in this event'; end if;
 if target_template_id is not null then
  select t.version,t.layout_json,t.background_path,t.background_mime into selected_template_version,selected_layout,selected_background_path,selected_background_mime
  from public.templates t where t.id=target_template_id and t.admin_id=caller;
  if not found then raise exception 'Template not found'; end if;
  frozen_layout:=jsonb_build_object('template_version',selected_template_version,'layout_json',selected_layout,'background_path',selected_background_path,'background_mime',selected_background_mime);
 else frozen_layout:=null; end if;
 new_id:='CERT-'||to_char(current_date,'YYYYMMDD')||'-'||upper(replace(gen_random_uuid()::text,'-',''));
 insert into public.certificates(admin_id,event_id,participant_id,template_id,certificate_id,achievement_title,participant_snapshot,idempotency_key,template_version,layout_snapshot)
 values(caller,target_event_id,target_participant_id,target_template_id,new_id,nullif(trim(target_achievement_title),''),participant_data,trim(request_key),selected_template_version,frozen_layout)
 on conflict do nothing returning * into inserted;
 if inserted.id is null then
  select c.* into inserted from public.certificates c where c.admin_id=caller and
  (c.idempotency_key=trim(request_key) or (c.event_id=target_event_id and c.participant_id=target_participant_id)) limit 1;
  if inserted.id is null then raise exception 'Certificate could not be issued; please retry'; end if;
  if inserted.event_id<>target_event_id or inserted.participant_id<>target_participant_id then raise exception 'This request key has already been used for another certificate'; end if;
  return query select inserted.id,inserted.certificate_id,inserted.status,false;
 else return query select inserted.id,inserted.certificate_id,inserted.status,true; end if;
end;
$$;
revoke all on function public.issue_certificate(uuid,uuid,uuid,text,text) from public;
grant execute on function public.issue_certificate(uuid,uuid,uuid,text,text) to authenticated;

create or replace function public.process_generation_jobs(max_items integer default 25)
returns table(processed integer,succeeded integer,failed integer)
language plpgsql security definer set search_path=''
as $$
declare item record; issued record; processed_count integer:=0; succeeded_count integer:=0; failed_count integer:=0;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required'; end if;
 for item in
  select i.id,i.job_id,i.admin_id,i.participant_id,j.event_id,j.template_id
  from public.generation_job_items i join public.generation_jobs j on j.id=i.job_id and j.admin_id=i.admin_id
  where i.status='queued' and j.status in ('queued','processing')
  order by j.created_at,i.created_at for update of i skip locked
  limit greatest(1,least(coalesce(max_items,25),100))
 loop
  update public.generation_jobs set status='processing' where id=item.job_id and admin_id=item.admin_id;
  perform set_config('request.jwt.claim.sub',item.admin_id::text,true);
  begin
   select * into issued from public.issue_certificate(item.event_id,item.participant_id,item.template_id,null,'job:'||item.id::text);
   update public.generation_job_items set status='completed',certificate_id=issued.certificate_id,completed_at=now(),error_message=null where id=item.id;
   succeeded_count:=succeeded_count+1;
  exception when others then
   update public.generation_job_items set status='failed',error_message=left(sqlerrm,500),completed_at=now() where id=item.id;
   failed_count:=failed_count+1;
  end;
  processed_count:=processed_count+1;
  update public.generation_jobs j set
   succeeded_rows=(select count(*) from public.generation_job_items i where i.job_id=j.id and i.status='completed'),
   failed_rows=(select count(*) from public.generation_job_items i where i.job_id=j.id and i.status='failed'),
   status=case when exists(select 1 from public.generation_job_items i where i.job_id=j.id and i.status='queued') then 'processing'::public.generation_job_status
    when exists(select 1 from public.generation_job_items i where i.job_id=j.id and i.status='failed')
     and not exists(select 1 from public.generation_job_items i where i.job_id=j.id and i.status='completed') then 'failed'::public.generation_job_status
    else 'completed'::public.generation_job_status end,
   completed_at=case when exists(select 1 from public.generation_job_items i where i.job_id=j.id and i.status='queued') then null else coalesce(j.completed_at,now()) end
  where j.id=item.job_id;
 end loop;
 return query select processed_count,succeeded_count,failed_count;
end;
$$;
revoke all on function public.process_generation_jobs(integer) from public,anon,authenticated;
grant execute on function public.process_generation_jobs(integer) to service_role;

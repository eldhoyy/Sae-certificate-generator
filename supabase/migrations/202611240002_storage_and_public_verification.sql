insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('certificate-templates','certificate-templates',false,10485760,array['image/png','image/jpeg','application/pdf']),
('issued-certificates','issued-certificates',false,20971520,array['application/pdf']),
('certificate-exports','certificate-exports',false,52428800,array['application/zip','text/csv'])
on conflict(id) do nothing;
create policy "Admins manage own template assets" on storage.objects for all to authenticated
using(bucket_id='certificate-templates' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='certificate-templates' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Admins read own issued PDFs" on storage.objects for select to authenticated
using(bucket_id='issued-certificates' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Admins read own exports" on storage.objects for select to authenticated
using(bucket_id='certificate-exports' and (storage.foldername(name))[1]=(select auth.uid())::text);
create or replace function public.public_verify_certificate(lookup_id text)
returns table(certificate_id text,participant_name text,event_name text,issue_date date,achievement_title text,status public.certificate_status)
language sql stable security definer set search_path='' as $$
 select c.certificate_id,c.participant_snapshot->>'full_name',e.name,c.issue_date,c.achievement_title,c.status
 from public.certificates c join public.events e on e.id=c.event_id and e.admin_id=c.admin_id
 where c.certificate_id=lookup_id limit 1;
$$;
revoke all on function public.public_verify_certificate(text) from public;
grant execute on function public.public_verify_certificate(text) to anon,authenticated;

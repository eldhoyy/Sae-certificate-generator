-- Make the email duplicate rule race-safe at the database boundary.
-- Empty or NULL emails remain allowed; uniqueness is case-insensitive per event and tenant.
create unique index if not exists participants_event_email_unique
  on public.participants(admin_id, event_id, lower(email))
  where email is not null and btrim(email) <> '';

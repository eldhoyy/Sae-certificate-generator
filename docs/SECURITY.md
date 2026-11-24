# Security model and release checklist

## Implemented controls
- Tenant-owned records include an `admin_id`; relational foreign keys bind child records to the same owner.
- PostgreSQL Row Level Security is enabled for tenant tables and the organization-settings table.
- Normal profile updates use a narrowly scoped RPC; Super Admin role changes use a protected database function that preserves at least one Super Admin.
- Administrator invitations are sent only by a server action that verifies the caller's Super Admin role and uses a server-only Supabase service role key.
- Certificate issuance validates the authenticated owner of the event, participant and optional template; immutable issuance snapshots include the event name and template layout.
- Issuance is idempotent and a database unique index enforces one certificate per participant per event.
- Certificate IDs are globally unique; revocation preserves the original certificate record and identifier.
- Template layout version, field configuration and background asset path are snapshotted at issuance.
- Public verification returns a limited set of certificate fields rather than a raw row.
- Template, issued PDF and export storage buckets are private.
- Folder, event, participant, template, certificate, organisation-setting and administrator role changes are recorded through audit triggers; certificate revocations include their reason.
- Template source assets cannot be deleted while a saved template or issued certificate snapshot references them.
- Template layout payloads are schema-validated and bounded to 40 fields; background object paths must be under the authenticated administrator's Storage prefix.

## Dependency security
- SheetJS is pinned to the official 0.20.3 distribution because the older npm-registry 0.18.5 release has known spreadsheet-parser vulnerabilities. Re-run `npm audit` and review the full report whenever dependencies change.

## Required before production
1. Disable public sign-ups and configure SMTP in Supabase Authentication settings. Use the Super Admin invitation workflow for administrator onboarding.
2. Create the first Super Admin using the controlled SQL bootstrap in `docs/SETUP.md`; never expose role assignment publicly.
3. Test RLS with at least two normal admin users and one Super Admin, including cross-tenant reads, inserts, updates, deletes and storage paths.
4. Review every SECURITY DEFINER function, grants and search_path. Run migrations against a disposable Supabase project first.
5. Add rate limiting and abuse monitoring to public verification.
6. Add signed-download endpoints or authenticated streaming for private PDFs and exports; never make storage buckets public.
7. Validate spreadsheet uploads and enforce parser resource limits; template PNG/JPEG/PDF signatures and size are checked server-side.
8. Add integration and end-to-end tests for auth, tenant isolation, issuance idempotency, revocation, imports and PDF output.
9. Configure production secrets only in the hosting provider. Never commit service-role keys.
10. Configure backups, retention, error reporting and audit-log retention.

## Important limitations
- A migration or source-code change does not configure the Supabase project itself. Dashboard settings, secrets, migration execution and live security tests remain operational steps.
- Bulk generation currently uses bounded synchronous server actions and browser-side ZIP assembly; use a durable worker for large workloads.
- The template editor and renderer support PNG/JPG/PDF backgrounds; PDF output embeds the first PDF page. Custom font uploads are not implemented.
- Historical re-rendering depends on retaining the private source background object in Supabase Storage; the latest migration blocks authenticated deletion while any saved template or issued certificate references it.
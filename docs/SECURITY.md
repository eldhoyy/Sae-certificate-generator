# Security model and release checklist

## Implemented controls
- Tenant-owned records include an `admin_id`; relational foreign keys bind child records to the same owner.
- PostgreSQL Row Level Security is enabled for tenant tables and the organization-settings table.
- Normal profile updates use a narrowly scoped RPC; Super Admin role changes use a protected database function.
- Certificate issuance validates the authenticated owner of the event, participant and optional template.
- Issuance is idempotent and a database unique index enforces one certificate per participant per event.
- Certificate IDs are globally unique; revocation preserves the original certificate record and identifier.
- Template layout version, field configuration and background asset path are snapshotted at issuance.
- Public verification returns a limited set of certificate fields rather than a raw row.
- Template, issued PDF and export storage buckets are private.
- Core folder, event, participant, template and certificate mutations are recorded through audit triggers.

## Required before production
1. Disable public sign-ups in Supabase Authentication settings. Provision accounts only through a trusted operator process.
2. Create the first Super Admin using the controlled SQL bootstrap in `docs/SETUP.md`; never expose role assignment publicly.
3. Test RLS with at least two normal admin users and one Super Admin, including cross-tenant reads, inserts, updates, deletes and storage paths.
4. Review every SECURITY DEFINER function, grants and search_path. Run migrations against a disposable Supabase project first.
5. Add rate limiting and abuse monitoring to public verification.
6. Add signed-download endpoints or authenticated streaming for private PDFs and exports; never make storage buckets public.
7. Validate file contents, not only extension/MIME claims. Enforce upload and import limits.
8. Add integration and end-to-end tests for auth, tenant isolation, issuance idempotency, revocation, imports and PDF output.
9. Configure production secrets only in the hosting provider. Never commit service-role keys.
10. Configure backups, retention, error reporting and audit-log retention.

## Important limitations
- A migration or source-code change does not configure the Supabase project itself. Dashboard settings, secrets, migration execution and live security tests remain operational steps.
- Bulk generation currently uses bounded synchronous server actions and browser-side ZIP assembly; use a durable worker for large workloads.
- The template editor and renderer currently support PNG/JPG backgrounds, not PDF backgrounds or custom font uploads.
- Historical re-rendering still depends on retaining the private source background object in Supabase Storage.
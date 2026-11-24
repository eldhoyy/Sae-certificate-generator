# Security model and release checklist

## Current controls
- Tenant-owned records include an `admin_id`; relational foreign keys bind child records to the same owner.
- PostgreSQL row-level security is enabled for tenant data.
- Normal profile updates are exposed through a narrowly scoped RPC; role changes are Super Admin-only.
- Certificate issuance is performed by a database function that checks the authenticated owner of the event and participant.
- Issuance accepts an idempotency key and stores a unique per-admin key to prevent duplicate issuance on retries.
- Certificate IDs are unique at database level.
- Revocation preserves the original certificate record and identifier.
- Public verification returns a limited set of certificate fields rather than a raw row.
- Template, issued PDF and export buckets are private.

## Required before production
1. Disable public sign-ups in Supabase Authentication settings. Provision accounts only through a trusted administrator process.
2. Create the first Super Admin through a controlled SQL migration or trusted operator procedure; never expose a public role assignment endpoint.
3. Test RLS with at least two normal admin users and one Super Admin, including cross-tenant reads, inserts, updates, deletes and storage paths.
4. Review every SECURITY DEFINER function, grants and search_path. Run migrations against a disposable Supabase project first.
5. Add rate limiting and abuse monitoring to public verification.
6. Add signed-download endpoints for private PDFs and exports; never make storage buckets public.
7. Validate file contents, not only extension/MIME claims. Enforce upload and import limits.
8. Add integration and end-to-end tests for auth, tenant isolation, issuance idempotency, revocation, imports and PDF output.
9. Configure production secrets only in the hosting provider. Never commit service-role keys.
10. Configure backups, retention, error reporting and audit-log retention.

## Important limitation
A migration or source-code change does not configure the Supabase project itself. Dashboard settings, secrets, migration execution and live security tests remain operational steps.

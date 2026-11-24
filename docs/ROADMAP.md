# Development Roadmap

## Stage 0 — Discovery and foundation
- [x] Read project handover and reference workflow.
- [x] Establish initial stack, product specification and architecture.
- [ ] Inspect starter ZIP if supplied.
- [ ] Complete source-level license/security audit of reference repositories.

## Stage 1 — Repository and application foundation
- [x] Create Next.js + TypeScript application scaffold.
- [x] Configure linting, environment example and CI workflow.
- [x] Add responsive application shell and route structure.
- [x] Add Supabase client/server utilities.
- [x] Add initial schema and storage migrations.
- [ ] Run install, lint, typecheck and production build in a real checkout.
- [ ] Resolve all build and type errors.

## Stage 2 — Authentication and tenant security
- [x] Add initial tenant ownership constraints and RLS policies.
- [x] Add role-management RPCs restricted to Super Admin.
- [x] Disable public signup in the application UI.
- [x] Add security and production configuration checklist.
- [x] Add idempotent certificate issuance and revocation database functions.
- [ ] Disable public signups in the Supabase project dashboard.
- [ ] Establish the first Super Admin through a trusted operator process.
- [ ] Add two-tenant RLS and storage isolation tests.
- [ ] Review all SECURITY DEFINER functions and grants with live database tests.

## Stage 3 — Dashboard, folders and events
- [ ] Dashboard metrics from live data.
- [ ] Folder CRUD with persistence.
- [ ] Event CRUD and event workspace.
- [ ] Search, filtering, sorting and pagination.

## Stage 4 — Participant management
- [ ] Individual participant CRUD.
- [ ] Record-only and issue-certificate workflows.
- [ ] CSV/XLSX upload, mapping, preview and validation.
- [ ] Duplicate detection and confirmed import.
- [ ] Participant search and filters.

## Stage 5 — Template designer
- [ ] PDF/image background upload and validation.
- [ ] React Konva canvas with true drag/resize interactions.
- [ ] Dynamic field binding and typography controls.
- [ ] QR placement and sample preview.
- [ ] Versioned saved layouts and reuse.

## Stage 6 — Certificate issuance
- [x] Database-enforced unique certificate IDs.
- [x] Idempotency-key support in database issuance function.
- [x] Revocation without deleting issuance history.
- [ ] Complete PDF renderer using saved background and layout.
- [ ] Bulk generation jobs and retry handling.
- [ ] Individual download and ZIP export.

## Stage 7 — Public verification
- [x] Initial public lookup function with minimal output fields.
- [ ] Verification page states and QR destination.
- [ ] Signed download flow and rate limiting.
- [ ] Live tests for valid, revoked and unknown IDs.

## Stage 8 — Release readiness
- [x] Add GitHub Actions CI workflow definition.
- [ ] Confirm CI passes on GitHub.
- [ ] Automated unit, integration and end-to-end tests.
- [ ] Tenant-isolation and authorization tests.
- [ ] Upload/import/PDF stress tests.
- [ ] Accessibility and responsive checks.
- [ ] Production deployment and operational verification.

## Completion policy
A feature is complete only when its data flow and relevant tests pass. A checked source-code item does not mean the live Supabase or deployment configuration is complete.

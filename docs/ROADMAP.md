# Development Roadmap

## Stage 0 — Discovery and foundation
- [x] Read project handover.
- [x] Inspect supplied FIRL recording and distinguish observed workflow from added requirements.
- [x] Establish initial stack and architecture direction.
- [x] Create product specification and project documentation.
- [ ] Inspect starter ZIP if supplied.
- [ ] Inspect reference repositories at source-code level, including licenses and security-sensitive implementation.

## Stage 1 — Repository and application foundation
- [ ] Create Next.js + TypeScript application scaffold.
- [ ] Configure linting, formatting, environment validation and error handling.
- [ ] Add responsive design system and application shell.
- [ ] Add Supabase client/server utilities.
- [ ] Add database migrations and local setup documentation.

## Stage 2 — Authentication and tenant security
- [ ] Admin sign-in and controlled account provisioning.
- [ ] Super Admin role and management.
- [ ] Admin profile and tenant context.
- [ ] RLS policies and cross-tenant isolation tests.

## Stage 3 — Dashboard, folders and events
- [ ] Dashboard metrics.
- [ ] Folder CRUD.
- [ ] Event CRUD and event workspace.
- [ ] Search, filtering and pagination.

## Stage 4 — Participant management
- [ ] Individual participant entry.
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
- [ ] Database-enforced unique ID allocation.
- [ ] Idempotent issuance workflow.
- [ ] PDF renderer and visual parity checks.
- [ ] Bulk generation jobs and retry handling.
- [ ] Individual download and ZIP export.

## Stage 7 — Public verification
- [ ] Public certificate lookup.
- [ ] QR destination and verification page.
- [ ] Valid/revoked/invalid states.
- [ ] Minimal public data exposure and rate limiting.

## Stage 8 — Release readiness
- [ ] Automated unit, integration and end-to-end tests.
- [ ] Tenant-isolation and authorization tests.
- [ ] Upload/import/PDF stress tests.
- [ ] Accessibility and responsive checks.
- [ ] Production deployment and operational documentation.

## Completion policy

Do not mark a feature complete based on a visual page alone. Mark it complete only after the underlying data flow and relevant tests pass. Record actual test commands and outcomes.

# Initial Architecture

## Decision

Use a TypeScript-first Next.js application with Supabase as the managed PostgreSQL, authentication and object-storage platform. Use a server-side application layer for authorization and business rules. Keep the design modular so generation can move to a dedicated worker without changing the product model.

## Application layers

1. **Presentation:** Next.js App Router, responsive admin UI, template editor and public verification routes.
2. **Server application:** authenticated server actions/route handlers, schema validation, tenant context, issuance orchestration and audit logging.
3. **Data:** Supabase PostgreSQL with RLS, foreign keys, unique constraints and transaction-safe database functions where needed.
4. **Storage:** private Supabase Storage buckets for source templates and issued PDFs; controlled signed downloads.
5. **Generation:** React Konva layout model; pdf-lib renderer; QR generation; CSV/XLSX parsing; asynchronous bulk job processing.

## Tenant isolation

- Every tenant-owned row carries a non-null `admin_id` referencing the owning admin profile.
- RLS policies validate the authenticated user's tenant identity for every read/write.
- Server-side code must use the authenticated user context; the Supabase service-role key must never be exposed to browsers.
- Super Admin privileges must be explicitly modelled and narrowly granted. Do not rely on client-side role checks.
- Cross-tenant access tests are mandatory before release.

## Initial domain model

- `profiles`: user identity and role (admin/super_admin).
- `event_folders`: admin-owned folders.
- `events`: admin-owned events, optionally grouped in a folder.
- `participants`: event-linked participant records.
- `templates`: source asset, owner, metadata and versioned layout JSON.
- `certificates`: immutable issuance identity, unique certificate ID, participant/event/template references, status and output asset metadata.
- `generation_jobs`: bulk import/generation lifecycle and row-level results.
- `audit_logs`: actor, action, resource and timestamp.

Detailed SQL constraints and RLS policies will be designed before feature implementation.

## Certificate identity and rendering

- Certificate IDs are generated server-side and protected by a database unique constraint.
- Issuance is idempotent: retrying a render/download for an existing issuance must not create another certificate.
- Store the exact template-layout version and relevant issuance snapshot with each certificate.
- Preview and PDF output must share the same normalized canvas coordinate system.
- PDF generation must preserve background dimensions/aspect ratio and embed supported fonts where licensing permits.

## Bulk processing

- Parse and validate files before confirmation.
- Persist an import/job record and row-level validation results.
- Process in bounded batches with retry-safe operations.
- Report success/failure per participant; do not silently drop invalid rows.
- Produce a ZIP only after the job's output set is known and ready.

## Security boundaries

- Private storage by default.
- Public verification returns a deliberately limited DTO, never raw database rows.
- Verify ownership on every event, participant, template, job and certificate operation.
- Validate file type by content where possible, not filename alone.
- Apply upload limits, rate limits, CSRF-safe mutation patterns and audit logging.
- Keep secrets in environment variables and never commit `.env.local`.

## Initial stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth, PostgreSQL, RLS and Storage
- React Konva
- pdf-lib
- PapaParse + SheetJS
- qrcode
- Vercel + Supabase deployment

This is the approved working direction for the first implementation stage. Revisit choices only when a concrete requirement or measured limitation justifies it.

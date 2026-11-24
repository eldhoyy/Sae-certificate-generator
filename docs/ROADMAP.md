# Delivery roadmap

## Implemented in the repository
- [x] Authenticated workspace shell and dashboard
- [x] Event folders and events
- [x] Individual participant records with search and pagination
- [x] CSV/Excel import with name/email/custom-field mapping, preview and database-enforced email duplicate checks
- [x] PNG/JPG/PDF template designer with sample preview, draggable/resizable fields and saved layouts
- [x] Individual certificate issuance, authenticated PDF downloads and reasoned revocation
- [x] One permanent certificate per participant per event
- [x] Template-backed PDF output for saved PNG/JPG/PDF templates
- [x] QR field rendering and public verification lookup
- [x] Bulk issuance and ZIP PDF export
- [x] Super Admin role management
- [x] Profile and organisation settings
- [x] Tenant-aware SQL schema, RLS and private storage policies
- [x] Selectable standard font families, bold/italic styling, alignment and field width controls
- [x] Replace vulnerable npm SheetJS release with official patched distribution
- [x] Migrate Next.js 16 middleware convention to proxy


## Remaining before production
- [ ] Apply migrations to a real Supabase project and test bootstrap/auth flows.
- [x] Add PDF background upload and first-page PDF embedding.
- [x] Snapshot selected template layout and background asset path at issuance.
- [x] Add immutable asset retention controls so template source files cannot be removed while referenced by issued certificates.
- [ ] Add custom font upload/embedding and preview/PDF typography parity.
- [x] Add durable asynchronous generation queue, scheduled worker, job status and row-level failure reporting.
- [ ] Add a retry action for failed queue items and queued-job ZIP packaging.
- [x] Add server-side PNG/JPEG/PDF signature and size validation before saving or rendering templates.
- [ ] Add rate limiting and abuse monitoring to public verification.
- [ ] Add automated integration and end-to-end tests, including two-tenant RLS and Storage isolation.
- [ ] Apply organization settings to certificate branding and output preferences.
- [x] Add Super Admin-only account invitation delivery and secure admin provisioning workflow.
- [ ] Review dependency audit findings and update vulnerable packages.
- [ ] Configure backups, monitoring, error reporting and retention.
- [ ] Configure CRON_SECRET and confirm Vercel Cron plan/schedule support.
- [x] Increase certificate ID random suffix to 128 bits.
- [x] Prevent deletion of template assets referenced by saved templates or issued certificates.
- [x] Audit organisation settings, administrator role changes and certificate revocation reasons.

- [x] Snapshot event name at issuance for stable historical certificate rendering.
- [x] Validate template field payloads and administrator-owned Storage paths.
- [x] Open the individual PDF tab synchronously to avoid popup blocking after issuance.
- [x] Enforce case-insensitive participant email uniqueness per event in PostgreSQL.
- [x] Bound participant custom fields and certificate template field schemas.
- [x] Prevent removal of the final Super Admin and validate direct issuance RPC title input.
- [x] Add sample-value preview mode in the certificate designer.
- [x] Bound public certificate verification lookup input at the page and database function.
- [x] Personalize the workspace header and hide administrator controls from non-Super Admin navigation.
- [x] Map selected CSV/Excel columns into participant custom fields and snapshot them at issuance.
- [x] Render custom participant tokens case-insensitively in saved certificate layouts.
- [x] Add field width, text alignment and italic typography controls to the designer and PDF renderer.

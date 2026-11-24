# Delivery roadmap

## Implemented in the repository
- [x] Authenticated workspace shell and dashboard
- [x] Event folders and events
- [x] Individual participant records with search and pagination
- [x] CSV/Excel import with column mapping, preview and email duplicate checks
- [x] PNG/JPG template designer and saved layouts
- [x] Individual certificate issuance, authenticated PDF downloads and reasoned revocation
- [x] One permanent certificate per participant per event
- [x] Template-backed PDF output for saved PNG/JPG/PDF templates
- [x] QR field rendering and public verification lookup
- [x] Bulk issuance and ZIP PDF export
- [x] Super Admin role management
- [x] Profile and organisation settings
- [x] Tenant-aware SQL schema, RLS and private storage policies
- [x] Selectable standard font families and bold styling
- [x] Replace vulnerable npm SheetJS release with official patched distribution
- [x] Migrate Next.js 16 middleware convention to proxy


## Remaining before production
- [ ] Apply migrations to a real Supabase project and test bootstrap/auth flows.
- [x] Add PDF background upload and first-page PDF embedding.
- [x] Snapshot selected template layout and background asset path at issuance.
- [ ] Add immutable asset retention controls so template source files cannot be removed while referenced by issued certificates.
- [ ] Add custom font upload/embedding and preview/PDF typography parity.
- [ ] Add durable asynchronous generation worker with job status, retry and row-level error reporting.
- [ ] Add server-side file-content validation and stricter upload validation.
- [ ] Add rate limiting and abuse monitoring to public verification.
- [ ] Add automated integration and end-to-end tests, including two-tenant RLS and Storage isolation.
- [ ] Apply organization settings to certificate branding and output preferences.
- [ ] Add account invitation delivery and secure admin provisioning workflow.
- [ ] Review dependency audit findings and update vulnerable packages.
- [ ] Configure backups, monitoring, error reporting and retention.
# Certificate Management Platform

A multi-administrator certificate management platform built with Next.js, TypeScript and Supabase. Each administrator has an isolated workspace for event folders, events, participants, templates and issued certificates. A platform Super Admin can invite administrators and manage administrator roles.

## Implemented application workflows
- Authenticated workspace with dashboard, event folders and event management.
- Individual participant creation, searchable/paginated records and CSV/XLS/XLSX import with name/email mapping, optional custom-field columns, preview, validation and database-enforced case-insensitive email uniqueness per event.
- Visual template designer for PNG/JPG/PDF backgrounds, draggable/resizable dynamic fields for participant, event, achievement, issue date and imported custom values; sample-value preview, QR verification, font family, size, colour, alignment, bold and italic.
- Individual certificate issuance, authenticated PDF download and reasoned revocation.
- Individual certificate issuance and durable bulk-generation jobs for up to 5,000 participants per event, with per-row status and background processing.
- Saved PNG/JPG/PDF template rendering in landscape A4 PDF output, including dynamic text and QR fields.
- Public certificate verification by certificate ID, with a deliberately limited result and bounded lookup input.
- Database-enforced tenant ownership, protected Super Admin role changes, profile and organisation settings.
- Private Supabase Storage buckets with file-signature validation, protected template asset retention and audit log triggers for workspace, organisation, role and revocation changes.

## Stack
- Next.js App Router, React and TypeScript; Tailwind CSS
- Supabase Auth, PostgreSQL, Row Level Security and Storage
- pdf-lib, qrcode, PapaParse, official patched SheetJS distribution and JSZip

## Local setup
1. Use Node.js 22 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; set `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret for administrator invitations.
4. Create a Supabase project and apply every SQL migration in `supabase/migrations` in filename order.
5. Disable public sign-ups in Supabase Authentication settings.
6. Create the first trusted administrator through Supabase Auth. Promote the platform owner using the SQL statement in [docs/SETUP.md](docs/SETUP.md).
7. Configure Supabase Auth site URL and redirect URLs.
8. Set `NEXT_PUBLIC_APP_URL` to the public app origin for QR verification links.
9. Run `npm install` and `npm run dev`.

## Validation
Run `npm run typecheck`, `npm run lint` and `npm run build`. GitHub Actions runs these checks on pushes to `main` and pull requests. Check the latest workflow status before treating a commit as validated.

## Known limitations before production
- PDF template backgrounds are supported using the first page; browser preview depends on the device's built-in PDF viewer.
- The editor uses a fixed landscape canvas; stored page-size preferences are not yet applied to rendering.
- Bulk generation is queued in PostgreSQL and processed in small batches by a scheduled Vercel Cron route. Configure CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY, enable Vercel Cron on a plan that supports the five-minute schedule, and monitor job progress. Completed job certificates can be packaged into a browser-generated ZIP (up to 2,500 PDFs per download); individual PDFs remain downloadable from the issued-certificate list.
- Email is the duplicate key for imports; rows without email are accepted and may represent repeated names.
- Template rendering uses standard PDF fonts; custom font upload/embedding and full typography parity are not implemented.
- Administrator invitations use Supabase Auth and require the server-only service role key plus configured SMTP delivery.
- Organization settings are stored per administrator and are not yet printed on certificates.
- No live Supabase project, production environment variables, deployment, or end-to-end tenant-security test has been configured in this repository session.

Do not issue production certificates until migrations have been applied and the security checklist has been completed.

## Documentation
- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security checklist](docs/SECURITY.md)
- [Setup](docs/SETUP.md)
- [Roadmap](docs/ROADMAP.md)
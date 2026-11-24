# Certify — Certificate Management Platform

Multi-tenant certificate creation, issuance and public verification.

## Includes
Responsive workspace UI for dashboard, folders, events, participants, templates, certificates, verification, administrators and settings; Supabase auth clients; tenant-aware SQL migrations; interactive template layout editor; CSV/XLSX parsing, QR and PDF utilities.

## Local setup
1. Node.js 20.9+ and npm.
2. npm install
3. Copy .env.example to .env.local and add Supabase URL and anon key.
4. Apply supabase/migrations in filename order.
5. Configure Supabase Auth redirect URLs.
6. npm run dev

Never expose service-role credentials to browser code. Promote the trusted platform owner to super_admin only through the Supabase SQL editor.

The UI and integration foundation are present. Persistent workflows require Supabase configuration and server integration. Review docs/SETUP.md before production. No build or runtime tests have yet been run.

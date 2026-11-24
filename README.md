# Certificate Management Platform

A multi-admin certificate management platform built with Next.js, TypeScript and Supabase.

## Current status
This repository contains the initial application shell, route structure, Supabase integration foundation, tenant-aware SQL schema, private storage buckets, public verification function, and initial security/issuance database functions.

The UI pages are not yet a complete operational product. Folder/event/participant/template screens and the visual designer still need their full persistent workflows. PDF rendering from saved templates, bulk generation, ZIP exports, and end-to-end verification are not complete. Do not use this as a production certificate issuer yet.

## Stack
- Next.js App Router and TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, RLS and Storage
- pdf-lib, QRCode, PapaParse, SheetJS and JSZip

## Local setup
1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Install dependencies with `npm install`.
5. Run database migrations in order in a disposable Supabase project.
6. Disable public signups in Supabase Auth settings; admin provisioning is intended to be controlled.
7. Run `npm run dev`.

## Validation
```bash
npm run typecheck
npm run lint
npm run build
```

GitHub Actions runs these checks on pushes and pull requests to `main`. A workflow definition is not proof that the checks have passed.

## Documentation
- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security checklist](docs/SECURITY.md)
- [Setup](docs/SETUP.md)
- [Roadmap](docs/ROADMAP.md)

## Security
Never commit service-role keys or production credentials. Review [docs/SECURITY.md](docs/SECURITY.md) before connecting a live Supabase project.

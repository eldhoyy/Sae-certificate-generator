# Certificate Management Platform

A multi-tenant certificate management and verification platform inspired by the event-folder workflow observed in FIRL. This is an independent implementation with its own architecture, branding and code.

## Product goals

- Isolated administrator workspaces with a platform-level Super Admin.
- Event folders, events, participants and reusable certificate templates.
- A real visual certificate designer with uploaded PDF/image backgrounds.
- Individual and bulk certificate issuance with stable unique IDs.
- QR-enabled public verification and controlled certificate downloads.
- Auditable, secure and responsive administration.

## Technology direction

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth + PostgreSQL + Row Level Security + Storage
- React Konva for the visual editor
- pdf-lib for PDF composition
- PapaParse and SheetJS for CSV/XLSX imports
- qrcode for verification QR codes

The exact dependency versions and deployment configuration will be recorded during implementation.

## Project status

**Stage:** Product specification and architecture foundation.

No production functionality is claimed yet. See [ROADMAP.md](docs/ROADMAP.md) for implementation stages and [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the proposed system design.

## Local development

Setup instructions will be added with the first application scaffold. Do not commit secrets. Use environment variables documented in `.env.example` when available.

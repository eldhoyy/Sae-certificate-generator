# Product Specification

## 1. Purpose

Build an independent certificate management platform for colleges, student organisations, event teams and institutions. FIRL is the primary workflow reference; the uploaded recording is the source for observed UI/workflow details. Additional capabilities below come from the project handover and are requirements, not claims about FIRL.

## 2. Roles

### Super Admin
- Manage administrator accounts and platform access.
- View platform-wide operational information.
- Disable or restore administrator accounts.
- Access platform-level audit information.

### Admin
- Own and manage their folders, events, participants, templates, issued certificates and generation jobs.
- Cannot read or modify another administrator's tenant data.

## 3. Core workflows

1. Admin signs in and opens their dashboard.
2. Admin creates an event folder and creates events within it.
3. Admin uploads a certificate background and configures a reusable layout.
4. Admin adds a participant individually or imports a CSV/XLSX file.
5. Admin saves a participant record or issues a certificate.
6. The system assigns a stable unique certificate ID and creates a PDF with a QR verification link.
7. The admin downloads individual PDFs or a ZIP for a bulk job.
8. Anyone can verify a certificate through its public ID/QR URL.

## 4. Functional requirements

### Dashboard and organisation
- Dashboard statistics: folders/events, participants, certificates issued and recent activity.
- Event folders and separate event workspaces.
- Search, sorting, filtering and pagination where appropriate.

### Events and participants
- Event details and event-specific participant records.
- Manual participant entry.
- CSV and Excel import with column mapping, preview, validation, duplicate detection and explicit confirmation.
- Record-only and save-and-issue actions.
- Search and filter participant/certificate records.

### Template designer
- Upload PDF, PNG, JPG/JPEG backgrounds.
- Place dynamic text and QR fields on a canvas.
- Support participant name, event name, certificate ID, issue date, achievement/title and custom fields.
- Drag, resize and position fields.
- Configure font family, size, colour, alignment, bold and italic.
- Preview sample output and save/reuse layouts.
- Store a versioned layout definition so issued certificates remain reproducible.

### Issuance
- Individual and bulk generation.
- Configurable certificate ID format.
- Database-enforced uniqueness.
- Re-rendering/downloading an existing issuance must not create a new certificate record.
- Bulk jobs must be processed asynchronously and report per-row outcomes.
- Individual PDF and ZIP downloads.

### Public verification
- Public lookup by certificate ID and QR URL.
- Show only approved public fields: certificate ID, participant display name, event, issue date, achievement/type and validity status.
- Never expose admin email, internal IDs, private notes, storage keys or other tenant data.
- Support revoked/invalid status.

### Security and operations
- Tenant isolation enforced by PostgreSQL RLS and server-side authorization.
- Private template and PDF storage by default; public access only through controlled verification/download endpoints.
- Audit important administrative actions.
- Validate uploads, file sizes, MIME types and import limits.
- Rate-limit public verification and sensitive endpoints.

## 5. Observed reference workflow vs additional requirements

Observed in the supplied FIRL recording:
- Event-folder dashboard and event workspace.
- Participant record form.
- Separate save-only and generate-PDF actions.
- Template upload and text placement tabs.
- Typography controls, sample PDF preview and saved layout.
- Issued certificate records and public verification flow.

Additional requirements from this project brief:
- Super Admin and multiple isolated administrators.
- CSV/XLSX bulk import, validation and ZIP downloads.
- Full reusable visual editor, configurable ID policy, audit logs and production-grade security.

Features not clearly demonstrated in the recording must be treated as project requirements only when explicitly listed above, not as verified FIRL behaviour.

## 6. Quality gates

A feature is complete only when its real workflow is implemented and tested. A UI-only placeholder is not complete. No test, security audit or deployment will be reported as successful unless actually performed.

# Setup and integration

Requirements: Node.js 20.9+, npm and a Supabase project.

1. Run npm install.
2. Copy .env.example to .env.local.
3. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
4. Apply migrations in supabase/migrations in filename order.
5. Configure Supabase Auth redirect URLs.
6. Run npm run dev.

Promote the trusted platform owner through the Supabase SQL editor:
UPDATE public.profiles SET role='super_admin' WHERE id='<AUTH_USER_UUID>';

Do not expose service-role keys to browser code.

Before production: add server-side authorization to every mutation; implement transaction-safe idempotent issuance; complete PDF background parsing and layout rendering; implement bulk import review, job processing and ZIP creation; write audit events; add rate limiting; test cross-tenant isolation and public data minimisation.

Run npm run typecheck, npm run lint and npm run build after installing dependencies. These commands have not yet been executed in this GitHub-only session.

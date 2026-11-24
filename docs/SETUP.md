# Setup and integration

## Requirements
- Node.js 22+
- npm
- A Supabase project

## Local application
1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Add `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret to enable Super Admin invitations; never prefix it with `NEXT_PUBLIC_`.
3. Apply all SQL files in `supabase/migrations` in ascending filename order.
4. In Supabase Authentication settings, disable public sign-ups and configure SMTP/email delivery. Super Admins can then invite administrators from the Administrators page using the server-only service role key.
5. Configure the Supabase Auth site URL and allowed redirect URLs for localhost and your deployed domain.
6. Set `NEXT_PUBLIC_APP_URL` to the public app origin. This is used to create QR verification links.
7. Run `npm install`, then `npm run dev`.

## First Super Admin bootstrap
Create the trusted first administrator in Supabase Auth, then locate that user's UUID in Authentication > Users. Run the following once in the Supabase SQL editor, replacing the placeholder with the verified UUID:

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = '<AUTH_USER_UUID>';
```

Do not expose this operation through a public API. After bootstrap, Super Admin role changes are available through the protected `super_admin_set_role` database function and the Administrators page.

## Deployment
- Add the public Supabase URL and anon key to the hosting provider's environment.
- Add `SUPABASE_SERVICE_ROLE_KEY` as a server-only environment secret to enable invitation delivery. Do not expose it to client bundles.
- Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin.
- Configure Auth redirect URLs to include the deployed origin.
- Deploy the Next.js application.
- Keep service-role keys out of browser-visible environment variables and source control.


## Production checklist
See [SECURITY.md](SECURITY.md). Test cross-tenant access with two admin users and a Super Admin; validate private Storage paths; verify issuance idempotency and revocation; and run all CI checks. A successful build does not prove the Supabase policies or live auth configuration are correct.
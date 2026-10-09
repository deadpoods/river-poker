# Setup and deployment

## Local development

Install Node.js 24, then run `npm ci` and `npm run dev`. Open http://localhost:3000. With no `DATABASE_URL`, development uses PGlite, a real PostgreSQL runtime persisted in `.river-data/`. Preserve this directory to preserve local profiles and history. It is ignored by Git.

For an optimized local preview, run `npm run build`, then `RIVER_LOCAL_DATABASE=1 npm start`. The local adapter is disabled on Vercel; cloud games require an external database.

## Supabase PostgreSQL

1. Create your own Supabase project in a region near your hosting functions.
2. In **Connect → Direct → Transaction pooler**, copy the host, port, database and username. Use the project-specific values, not guessed hostnames. The transaction port is normally 6543.
3. In **Database → Settings → SSL configuration**, download the certificate supplied by the dashboard.
4. Set your server connection in `.env.local`. Percent-encode special characters in the password.

```dotenv
DATABASE_URL="postgresql://YOUR_ROLE.YOUR_PROJECT:ENCODED_PASSWORD@YOUR_POOLER_HOST:6543/postgres"
DATABASE_SSL_CA="-----BEGIN CERTIFICATE-----\nYOUR_DOWNLOADED_CERTIFICATE_CONTENT\n-----END CERTIFICATE-----"
```

`DATABASE_SSL_CA` accepts actual PEM newlines or literal `\n`. Use the downloaded certificate, not this placeholder. Remote connections always verify TLS certificates and hostnames. Prepared statements are disabled for transaction pooling.

Use a dedicated server role for River with permission to connect to the database and create tables in the public schema. It must own the River tables because setup performs DDL and the API uses owner access under RLS. It does not need superuser, database creation, role creation, replication or `BYPASSRLS`. Keep its password in server-side secrets.

The app calls `ensureSchema()` on first use; `npm run db:setup` can initialize it explicitly. Setup runs under an advisory transaction lock and creates five tables with RLS enabled. River does not use the Supabase Data API or client API keys. Disable Data API and automatic table exposure for a dedicated River project, or revoke direct `anon` and `authenticated` privileges on River’s tables. No public policies are needed: the existing API authorizes player requests.

Never use `NEXT_PUBLIC_` for database credentials. Never commit `.env.local`, session cookies, recovery keys or database exports.

## Vercel

1. Import this repository into your own Vercel project; use Next.js, Node.js 24 and `npm run build`.
2. Add `DATABASE_URL` as a **Secret**, and `DATABASE_SSL_CA` as certificate configuration for the environment you are deploying.
3. Align the function region in `vercel.json` with your database. This example currently uses Singapore (`sin1`).
4. Deploy a preview and run the verification described in [TESTING.md](TESTING.md).
5. Deploy production and verify its canonical address.

Use separate preview and production databases for a broader rollout. Preview tests create profiles and rooms. Vercel’s ephemeral filesystem is never a cloud persistence fallback.

The existing public River demo uses Supabase Free. It has storage, egress and inactivity limits, so it is unsuitable for an unmeasured capacity promise. No paid plan is required to run the local app.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Table service unavailable | Vercel runtime logs, provider quota/status, environment values and database connectivity |
| Certificate chain error | Supply the dashboard’s certificate through `DATABASE_SSL_CA`; keep verification enabled |
| Password authentication failed | Project, role, password and percent-encoding; do not assume project-admin and app-role passwords match |
| Database not configured | Set the server-only cloud connection; Vercel cannot use PGlite fallback |
| Bots seem idle | Start a practice table; human seats do not automatically become bots. Keep the table observed so requests/streams advance persisted due turns |
| Sound is silent | Enable sound and tap a preview or interact with the page to unlock browser audio |
| Old profile missing after changing databases | Database switches do not migrate identities; copy saved records separately, including session and recovery hashes |

[Back to README](../README.md)

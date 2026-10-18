# Vercel deployment

Vercel remains the production host. No VPS, container, additional authentication service or payment service is required. Keep the existing project/domain and review a Preview deployment before promoting the hardened application.

## Build and runtime

- Framework: Next.js; Node.js 22.x (at least 22.16).
- `engines.node` is fixed to `22.x`, matching CI and Docker, so Vercel will not select a new major automatically. pnpm 10.13.1 explicitly permits only the `esbuild` and `unrs-resolver` dependency install scripts; other dependency scripts remain blocked by default.
- Install: `pnpm install --frozen-lockfile`; build: `pnpm build`.
- Vercel builds first perform a read-only database readiness check: required columns and all eight application RPCs must be available with the server credential. An unavailable database, missing migrations or disabled PostgREST OpenAPI metadata stops the build before promotion. This never applies SQL or reads CV records; it does not replace the privileged grants/RLS verification. Local/CI builds without Vercel environment indicators skip this hosted check.
- Keep the repository's `postinstall`: on Linux x64 it installs SHA-256-verified portable Tectonic 0.16.9 into `vendor/tectonic-linux-x64/bin`. `pnpm build` then compiles every design with both typefaces and a synthetic photo to prepare `vendor/tectonic-cache`. The same version is installed on Windows x64 for local verification. Custom download URLs/versions require `TECTONIC_SHA256`. Build failure stops deployment if these resources cannot compile.
- Set `LATEX_RENDERER=tectonic`. The PDF routes use the Node runtime and allow 300 seconds. Verify Fluid Compute and your project's function duration settings.
- `next.config.mjs` explicitly traces the Tectonic binary, prepared LaTeX resources and dynamically loaded PDF workers into both private and public PDF functions. Run `pnpm check:bundles` after the build. The native binary check runs on Linux CI; a Windows build cannot validate the Linux executable.

## Environment

Keep existing working values. Configure each Vercel environment separately, using an isolated Supabase project for Preview/staging.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Required server-only credential: modern `sb_secret_...` key or legacy `service_role` key; modern takes precedence. Never use a `NEXT_PUBLIC_` prefix |
| `NEXT_PUBLIC_APP_URL` | Actual HTTPS application origin, including the Preview origin when testing authentication |
| `EMAIL_PROVIDER` | `smtp` or `resend`; console delivery is development-only |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Existing SMTP configuration when SMTP is selected |
| `RESEND_API_KEY` | Required only for Resend |
| `GROQ_API_KEY`, `GROQ_MODEL` | Groq integration; default model `llama-3.3-70b-versatile` |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Supported existing OpenRouter configuration when no Groq key is set |
| `GROQ_TIMEOUT_MS`, `OPENROUTER_TIMEOUT_MS` | Per-call timeouts, default 10/25 seconds; the whole structured request is bounded by 40 seconds |
| `LATEX_RENDERER` | `tectonic` on Vercel |

The public Supabase key may remain configured for compatibility, but the application never uses it as a privileged fallback. Groq takes precedence when both provider keys exist; provider failures produce labelled local analysis, without silently switching providers. Free models can queue or time out despite valid credentials. Set `TRUST_PROXY_HEADERS=0` on Vercel; its trusted deployment IP header is handled directly.

### Fixing missing database configuration during build

If the build reports `Missing deployment configuration`, the listed variable is absent or empty in that deployment's environment. A working local `.env.local` or a value saved only for Preview does not configure Production.

1. In Supabase, open the project's **Settings > API Keys**. Use a modern secret key (`sb_secret_...`) or the legacy `service_role` key, never the publishable/anon key. See [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).
2. In Vercel, open **Project > Settings > Environment Variables**. Save the key as `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, and the URL as `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`). Select **Production** for `main`; configure Preview separately with staging credentials.
3. Save and **Redeploy**. Environment changes affect new deployments only; see [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables).

The application still requires migrations 003/004 and verified permissions. Supplying a key does not apply SQL or bypass the schema check.

The previous application used `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` as a fallback for privileged queries. The hardened version deliberately removed that behavior: migration 003 denies browser roles access to private tables and application RPCs. The public key cannot supply the server permissions required by that schema. `Enable access to System Environment Variables` exposes Vercel deployment metadata; it does not create or replace a Supabase server key.

## Database rollout

`SUPABASE_URL` is an optional private runtime override for the database URL; otherwise the existing public URL is used. Keep it aligned with the intended Supabase environment. `pnpm db:check:public` uses only the public key and `LIMIT 0`; a successful empty query remains inconclusive about RLS and must be settled with the verification SQL.

Read [the coordinated migration and recovery procedure](docs/hardening-deployment.md). Back up first and apply `003-security-and-drafts.sql`, then `004-photo-assets.sql`, after migrations 001/002. Execute `scripts/verify-security.sql` using a privileged SQL session and test denial using the actual public key. Existing snapshots/data are preserved. Old application versions must stop writing before migration; a code-only rollback is unsafe.

## Payload and compilation limits

Vercel Functions limit request/response bodies to 4.5 MB. Photo uploads are capped at 4 MiB to leave room for multipart metadata; generated PDFs are also capped at 4 MiB. The renderer uses `/tmp`, bounded subprocess execution and a small in-memory cache. Prepared resources are copied to `/tmp` once per process, then Tectonic uses `--only-cached`; ordinary exports do not download LaTeX packages. Builds need outbound package access. Native binary execution and cold resource copying must still be tested on a real deployment. It never substitutes a different PDF layout when LaTeX fails.

See [Vercel function limits](https://vercel.com/docs/functions/limitations) and [duration configuration](https://vercel.com/docs/functions/configuring-functions/duration). Project configuration can be more restrictive than platform limits.

## Preview and production smoke checks

1. Verify magic-link email receipt, expiry, one-use consumption, logout and both users' access isolation.
2. Create/edit a CV, wait for autosave, reload, save several named snapshots, restore an older one and confirm original history is unchanged. Race two real database connections/tabs.
3. Upload a valid photo; reject malformed/oversized images. Test all sixteen templates, including a cold PDF render with the actual Tectonic runtime, current contact links and accented text.
4. Export PDF, LaTeX and portable JSON. Preview and PDF must agree; long CVs must receive an explicit overflow message unless multi-page export is selected.
5. Publish, edit privately, revoke, and verify public JSON, PDF and photo access immediately. Re-enable and confirm the old token stays revoked.
6. Run `pnpm test:ai:live` in a suitably configured local/staging shell. This sends only a synthetic CV and exits unsuccessfully when the provider falls back. Check real review/tailoring/condensation in Preview, including Pro permissions and apply/undo.
7. Check the Pro contact email and “online payment coming soon” wording. Contacting support must not grant Pro.

`/api/health` is inexpensive liveness/configuration information. It does not certify database grants, email delivery, provider availability or PDF compilation. Promote only after the real checks pass. No production deployment or database mutation was performed during local verification.

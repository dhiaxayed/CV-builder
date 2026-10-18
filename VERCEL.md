# Vercel deployment

Vercel remains the production host. No VPS, container, additional authentication service or payment service is required. Keep the existing project/domain and review a Preview deployment before promoting the hardened application.

## Build and runtime

- Framework: Next.js; Node.js 22.x (at least 22.16).
- `engines.node` is fixed to `22.x`, matching CI and Docker, so Vercel will not select a new major automatically. pnpm 10.13.1 explicitly permits only the `esbuild` and `unrs-resolver` dependency install scripts; other dependency scripts remain blocked by default.
- Install: `pnpm install --frozen-lockfile`; build: `pnpm build`.
- Builds compile the application and prepare LaTeX resources without querying Supabase. `pnpm db:check` and `pnpm db:check:deployment` are optional read-only diagnostics; they accept the original schema and do not apply migrations.
- Keep the repository's `postinstall`: on Linux x64 it installs SHA-256-verified portable Tectonic 0.16.9 into `vendor/tectonic-linux-x64/bin`. `pnpm build` then compiles every design with both typefaces and a synthetic photo to prepare `vendor/tectonic-cache`. The same version is installed on Windows x64 for local verification. Custom download URLs/versions require `TECTONIC_SHA256`. Build failure stops deployment if these resources cannot compile.
- Set `LATEX_RENDERER=tectonic`. The PDF routes use the Node runtime and allow 300 seconds. Verify Fluid Compute and your project's function duration settings.
- `next.config.mjs` explicitly traces the Tectonic binary and prepared LaTeX resources into both private and public PDF functions. Page counting uses pure JavaScript; PDF.js and native canvas stay in development tooling. Run `pnpm check:bundles` after the build. The native binary check runs on Linux CI; a Windows build cannot validate the Linux executable.

## Environment

Keep existing working values. Configure each Vercel environment separately, using an isolated Supabase project for Preview/staging.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Existing public key, accepted as in the original deployment; `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also recognized |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Optional server credential taking precedence over the public key; required for the restricted grants of migrations 003/004. Never expose these server credentials in the browser |
| `NEXT_PUBLIC_APP_URL` | Actual HTTPS application origin, including the Preview origin when testing authentication |
| `EMAIL_PROVIDER` | `smtp` or `resend`; console delivery is development-only |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Existing SMTP configuration when SMTP is selected |
| `RESEND_API_KEY` | Required only for Resend |
| `GROQ_API_KEY`, `GROQ_MODEL` | Groq integration; default model `openai/gpt-oss-120b`; unavailable model overrides get one retry with this replacement |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Supported existing OpenRouter configuration when no Groq key is set |
| `GROQ_TIMEOUT_MS`, `OPENROUTER_TIMEOUT_MS` | Per-call timeouts, default 10/25 seconds; the whole structured request is bounded by 40 seconds |
| `LATEX_RENDERER` | `tectonic` on Vercel |

Credential order is modern secret key, legacy service-role key, then the original public-key fallback. Existing environment variables need no renaming. Groq takes precedence when both AI provider keys exist; failures produce labelled local analysis, without silently switching providers. Free models can queue or time out despite valid credentials. Set `TRUST_PROXY_HEADERS=0` on Vercel; its trusted deployment IP header is handled directly.

Groq retired several models used by older configurations in 2026, including Llama 3.3 70B for free/developer tiers on August 16. The adapter preserves successful model overrides. A missing model (404) or explicit `model_decommissioned` response gets one retry on `openai/gpt-oss-120b`, using the same Groq key and request deadline. GPT-OSS requests use low reasoning effort and omit reasoning text. See [Groq's deprecation history](https://console.groq.com/docs/deprecations).

### Existing database compatibility

The server detects the original schema using a zero-row query. A missing draft column selects compatibility mode; a permission or network error does not trigger a downgrade. No new environment flag, server key or migration is required for the existing 001/002 deployment.

- Existing plaintext sessions/magic links remain usable. New credentials are hashed; a conditional update consumes a magic link once without a new RPC.
- Drafts and published copies use reserved JSON version rows numbered 0 and -1; historical snapshots remain numbered 1 and above. Conditional revision updates reject stale saves. Initial Free creation uses an expiring non-login lock in the existing token table. Photos use the existing uploaded-files table.
- Compatibility mode retains the project's existing database grants. It does not add privileges or certify browser-role isolation. Quotas are local to each serverless instance, and multi-request snapshot/photo operations do not have the migrated schema's transaction guarantees. Ambiguous photo failures may retain an owner-only asset for later cleanup.

For full browser-role restrictions and transactional RPCs, opt into the migrated mode below with an appropriate server credential. The application never changes database permissions automatically.

## Database rollout

`SUPABASE_URL` is an optional private runtime override for the database URL; otherwise the existing public URL is used. Keep it aligned with the intended Supabase environment. `pnpm db:check:public` uses only the public key and `LIMIT 0`; a successful empty query remains inconclusive about RLS and must be settled with the verification SQL.

To opt into the migrated mode, read [the coordinated migration and recovery procedure](docs/hardening-deployment.md). Back up first and apply `003-security-and-drafts.sql`, then `004-photo-assets.sql`, after migrations 001/002. Configure the server credential and execute `scripts/verify-security.sql` using a privileged SQL session. Migration 003 imports compatibility drafts and frozen public copies. Existing snapshots/data are preserved. Stop older instances before migration; a code-only rollback is unsafe after restricting database grants.

## Payload and compilation limits

Vercel Functions limit request/response bodies to 4.5 MB. Photo uploads are capped at 4 MiB to leave room for multipart metadata; generated PDFs are also capped at 4 MiB. The renderer uses `/tmp`, bounded subprocess execution and a small in-memory cache. Prepared resources are copied to `/tmp` once per process, then Tectonic uses `--only-cached`; ordinary exports do not download LaTeX packages. Builds need outbound package access. Native binary execution and cold resource copying must still be tested on a real deployment. It never substitutes a different PDF layout when LaTeX fails.

See [Vercel function limits](https://vercel.com/docs/functions/limitations) and [duration configuration](https://vercel.com/docs/functions/configuring-functions/duration). Project configuration can be more restrictive than platform limits.

## Preview and production smoke checks

1. Verify magic-link email receipt, expiry, one-use consumption, logout and both users' access isolation.
2. Create/edit a CV, wait for autosave, reload, save several named snapshots, restore an older one and confirm original history is unchanged. Race two real database connections/tabs.
3. Upload a valid photo; reject malformed/oversized images. Test all twenty-four templates, including a cold PDF render with the actual Tectonic runtime, current contact links and accented text.
4. Export PDF, LaTeX and portable JSON. Preview and PDF must agree; long CVs must receive an explicit overflow message unless multi-page export is selected.
5. Publish, edit privately, revoke, and verify public JSON, PDF and photo access immediately. Re-enable and confirm the old token stays revoked.
6. Run `pnpm test:ai:live` in a suitably configured local/staging shell. This sends only a synthetic CV and exits unsuccessfully when the provider falls back. Check real review/tailoring/condensation in Preview, including Pro permissions and apply/undo.
7. Check the Pro contact email and “online payment coming soon” wording. Contacting support must not grant Pro.

`pnpm test:production:legacy` verifies a built application using only a dummy public key and the original schema in an isolated PostgreSQL fixture. It covers pre-existing sessions/CVs, saves, history, restore, sharing and real PDF compilation. CI also runs editor/browser journeys in that configuration.

`/api/health` is inexpensive liveness/configuration information. It does not certify database grants, email delivery, provider availability or PDF compilation. Promote only after the real checks pass. No production deployment or database mutation was performed during local verification.

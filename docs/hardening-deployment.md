# Security and persistence rollout

This guide describes the optional migrated schema. Existing deployments can keep the original 001/002 schema and public key; the server detects that schema automatically. No migration runs during installation, build or application startup. See [VERCEL.md](../VERCEL.md) for compatibility behavior and its limits.

The application uses custom passwordless sessions, not Supabase Auth JWTs. In the migrated mode, private database access uses `SUPABASE_SECRET_KEY` (modern) or `SUPABASE_SERVICE_ROLE_KEY` (legacy); the modern key takes precedence. Browser roles have no table or application RPC access after migration 003. Ownership is checked in private queries in both modes. A publishable key cannot bypass the restricted grants of an already-migrated database.

## Before opting into the migrated schema

1. Back up the database. Use an isolated staging project first.
2. For a new database, apply `scripts/001-create-tables.sql`, then `002-add-plan-tier.sql`.
3. Apply `003-security-and-drafts.sql` and `004-photo-assets.sql`. These add columns, functions, grants and triggers; they do not delete CVs or historical snapshots. They copy the current editable contents into `cvs.draft_data` and freeze existing public content into a published snapshot. Existing snapshots cannot be reconstructed if earlier software already overwrote them.
4. Run the read-only `scripts/verify-security.sql`. Every listed table must have RLS enabled and browser privileges false. Application RPC execution must also be false for `anon` and `authenticated`. Inspect custom roles, policies, other exposed schemas and unrelated RPCs separately.
5. Set the server-only service-role key in the deployment environment. Never prefix it with `NEXT_PUBLIC_`, put it in a client file, or paste it into logs. The app returns a configuration error if privileged access is missing.
6. Coordinate migration and application rollout in a maintenance window. **The old application must not write after migration:** it updates historical versions and stores unhashed tokens. Do not roll back just the application binary.
7. Validate the flows below in staging before production rollout.

The build compiles the application and LaTeX resources without querying the database. `pnpm db:check` and `pnpm db:check:deployment` are optional read-only diagnostics, supporting the original schema as well as required migrated columns/RPC metadata. Apply SQL only through the coordinated procedure above, then redeploy. Passing a zero-row diagnostic does not certify RLS or complete the hosted smoke tests.

Migration 003 hashes existing tokens in place. Existing links and sessions remain usable through the new hashing code. Existing authorized Pro accounts are preserved, including the previous server-controlled `preferences.tier` representation. Contacting the Pro email never changes a plan.

## Draft, history and public data

`cvs.draft_data` is the editable source. `revision` changes on draft writes, snapshots, restoration and photo updates. Every write supplies the expected revision; conflicts return 409. A snapshot copies the persisted draft and template inside a row lock. A trigger rejects changes to snapshot content. Restoring copies a snapshot into the draft and advances the revision; it never changes the historical row. Concurrent snapshot attempts using the same revision produce one success and one conflict.

Free creation locks the owning user before counting their CVs. Creation, initial snapshot and current-version linking run in one transaction. Duplication uses this same creation operation. Deletion is a single owner-scoped delete with database cascades.

Public sharing freezes `published_data`, title and template at activation. Subsequent draft edits remain private. Repeating activation returns the existing token. Disable and re-enable sharing to publish a newer snapshot with a new token; old tokens stay revoked. Public JSON contains only `title`, `template_id` and `data`. CV contents can contain the contact details deliberately authored by the user.

Photo uploads are authenticated and owner-checked before decoding. Signatures, file size, pixel count, animation and image decode errors are checked. Optimized image data is stored once in `uploaded_files`; drafts and snapshots contain a stable `/api/photos/...` reference. File insertion and CV/profile update are transactional. Failed/conflicting uploads leave no inserted file. Removal uses the same draft save queue as other edits. Old images remain available to historical snapshots. JSON exports embed the image for portability. Existing inline legacy photos are supported and bounded, but are not automatically deduplicated across old history.

## Runtime configuration

Use Node 22.16 or newer. Configure SMTP or Resend for production; console delivery is development-only and displays the link in the development UI without logging it. Configure Groq or retain the existing `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` configuration. Groq takes precedence when both keys are present; a single validated adapter handles either provider. Without a working provider, clearly labelled local analysis and wording suggestions remain available. Vercel remains the production host; see [VERCEL.md](../VERCEL.md).

Rate limits use an atomic PostgreSQL counter shared across serverless instances. Authentication is limited by normalized email and a trusted deployment IP header on Vercel. Docker deployments should set `TRUST_PROXY_HEADERS=1` only behind their own reverse proxy, which must overwrite forwarded headers. Without a trusted IP source, anonymous operations share a conservative aggregate limit. Delete counters whose `window_start` is older than a day as scheduled database housekeeping; do not delete active counters. User-scoped AI, upload and PDF limits remain independent.

PDF exports require a functioning LaTeX runtime, not merely an engine version response. The renderer uses Latin Modern, geometry, hyperref, titlesec, enumitem, tabularx, needspace, ragged2e, graphicx and paracol. Docker/CI installs TeX Live. On Vercel, use the bundled Tectonic engine. The build prepares packages/fonts using synthetic documents; runtime seeds `/tmp` and compiles offline. Verify a cold real compile and function bundle size on Preview. PDF routes allow up to 300 seconds; confirm the hosting plan permits that duration and the native dependencies fit the function bundle.

The PDF renderer counts actual compiled pages, tries at most three density settings, and never reduces body text below 9.5 pt or margins below 12 mm. Strict one-page mode returns an actionable 422 if safe layout adjustments cannot fit all content. Multi-page export is an explicit checkbox. No content is silently removed. Unsupported character sets may require an extended font/runtime configuration; common Latin accents are tested. Multiple columns can affect ATS reading order; no template or score guarantees ATS acceptance.

## Staging verification

`pnpm db:check:public` performs read-only zero-row public-key requests. Only an explicit SQL permission denial is counted as a pass. Empty successful results may still be filtered by RLS and require privileged SQL inspection; they never justify claiming a data leak or a secure configuration on their own.

- Validate anonymous REST/RPC denial using the real public key, not the service-role key.
- Sign in as two test users. Attempt every private operation against the other user's CV. Expect 404 without data disclosure.
- Race the same magic link. Only one response may set a session. Verify expiry and logout.
- Race Free creations/duplications. Only one CV may exist for a Free account.
- Edit while autosaving, save named snapshots, restore an old snapshot, and edit again. Original snapshots must stay unchanged. Test two real database connections and tabs; the embedded local fixture serializes PostgreSQL connections and does not prove production lock scheduling.
- Upload valid and malformed photos, remove them, restore snapshots, and inspect the PDF/JSON output. Check orphan candidates without deleting images referenced by drafts, public snapshots, historical snapshots or user profiles.
- Publish, edit privately, revoke and re-enable. Check both public JSON and PDF after revocation, including cached renders and photo access.
- Run real SMTP and configured-provider smoke tests using synthetic CVs. Local automated provider tests mock HTTP contracts or deliberately disable providers; they do not prove live delivery/model availability. `pnpm test:ai:live` performs an explicit synthetic-CV provider check and fails if local fallback was used.
- Export all sixteen templates with representative real staging fixtures and verify thumbnails. `pnpm templates:generate` refreshes published preview images; the PDF suite detects stale renderer/fixture hashes.

## Recovery and rollback

Keep the new draft columns and snapshots. Application rollback to the old version is unsafe. Prefer rolling forward or restoring a coordinated database/application backup from the maintenance window after reconciling later user changes. Do not drop columns, reverse token hashing, or disable snapshot protections against a live database to make the old code work. Backups and migration rollback have not been exercised against the production project in this workspace.

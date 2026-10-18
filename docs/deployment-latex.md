# PDF runtime and source exports

PDF generation uses one LaTeX renderer for preview, private export and published CVs. All twenty-four templates share the same validated data contract and bounded layout policy. There is no alternate JavaScript PDF fallback.

## Vercel

Use `LATEX_RENDERER=tectonic` with Node.js 22.x. Linux `postinstall` installs the official portable musl Tectonic 0.16.9 executable, verifying the release SHA-256 before extraction. Windows uses the matching official version for local verification. `pnpm build` compiles the twenty-four designs with a synthetic photo and warms both typefaces at all three body densities, preparing a cache of the exact resources needed. The cache is an ignored build artifact containing only packages/fonts and synthetic compilation resources. Next's tracing includes that executable and the prepared TeX resource cache in both PDF routes. Run `pnpm build` and `pnpm check:bundles`; CI verifies the Linux native asset too. See [VERCEL.md](../VERCEL.md) for environment and rollout requirements.

Each compilation uses a unique temporary directory, disabled shell escape/untrusted mode, bounded logs and a 45-second process timeout. Prepared packages/fonts are shipped with the functions, copied to the OS temporary directory once per process and used with `--only-cached`. Package downloads happen during the build; a missing prepared cache in a local setup retains a bounded network-capable fallback. The function has a 300-second duration allowance, but actual Vercel project limits still apply. A successful local MiKTeX/TeX Live compilation does not validate the deployed Linux Tectonic runtime.

## Layout and portability

The prepared working set covers all twenty-four templates, the font/package resources used by both typefaces and all three density levels, including a synthetic photo. Missing-glyph warnings are treated as export errors: unsupported characters cannot silently disappear from a valid PDF.

The renderer counts actual PDF pages and checks TeX overfull boxes. It tries normal, compact and dense layouts without discarding text, reducing body type below 9.5 pt or margins below 12 mm. Strict one-page overflow returns 422 with the largest sections; users can shorten content or explicitly select multi-page output. Unsupported scripts/fonts can fail clearly and need a dedicated font configuration; Latin accents are tested.

Page counting uses `pdf-lib`, a pure JavaScript parser. `pdf-parse` is a development dependency for raster QA and thumbnail generation only: its PDF.js/native-canvas imports must not enter either serverless PDF function. The bundle check enforces this distinction. The studio offers both page modes and a direct multi-page recovery action after one-page overflow.

The eight additional catalogue IDs need corresponding rows in the existing `templates` table because `cvs.template_id` references it. Fresh installs include all 24 rows in `001`. With the original database configuration, `pnpm templates:sync` inserts missing catalogue entries only and confirms all IDs. Alternatively an owner can apply the data-only, idempotent `005-template-catalogue.sql`. Both retain existing template rows, permissions, schema and CVs. These are explicit maintenance commands, never build-time schema guards.

PDF and source downloads use the chosen compiled density. The editor's read-only source view uses the latest successful preview density for the same data/template/page mode, otherwise the base layout. Studio downloads wait for persistence and hold that revision while rendering; typing continues and subsequent saves wait in the same write queue. Previews run one compilation at a time and replace queued work with the latest draft, keeping the previous PDF visible with an explicit notice until the new one is ready.

Photos use an orientation-corrected centre crop with a transparent circular mask. Style settings can place them left or right; identity-sidebar designs retain them inside that column. Documents without a photo reserve no photo space. Source downloads containing a photo return a ZIP with `cv.tex`, the exact round `cv_photo.png`, and compilation instructions. The API retains raw `format: latex` for integrations; clients needing all assets use `format: latex-bundle`. Portable JSON embeds the original stored photo and reproduces the circular rendering through the application.

## Existing system-engine support

For local/CI or the repository's existing optional Docker setup, `LATEX_RENDERER=system` requires `pdflatex` or `xelatex`. `LATEX_CMD` selects an executable; it never installs one. `auto` tries system engines before Tectonic. Required packages include Latin Modern, geometry, hyperref, titlesec, enumitem, tabularx, needspace, ragged2e, graphicx and paracol. Vercel remains the production deployment target.

## Verification

CI runs `pnpm test:pdf` against TeX Live and again against bundled Tectonic with its prepared cache. `pnpm test:pdf` compiles every design, checks text/links/photo/special characters, compares raster output with published thumbnails, rejects excessive one-page content and verifies explicit multi-page preservation. `python scripts/check-pdf-layout.py` checks actual character positions in the twenty-four generated PDFs. `pnpm templates:generate` refreshes the real PDF thumbnails and their source hash using production Tectonic. System-engine checks validate portability; pixel comparison is performed against Tectonic output.

`/api/health` is liveness only. Readiness requires an authenticated real PDF request on the deployed runtime, followed by page-count/text/visual inspection. Engine discovery or `--version` output is insufficient.

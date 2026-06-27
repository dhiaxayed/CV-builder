# LaTeX PDF deployment

PDF export is intentionally LaTeX-only. The app generates `.tex`, compiles it with a real LaTeX engine, and returns the compiled PDF.

## Required runtime

The production runtime must provide one real LaTeX engine:

- `pdflatex`
- `xelatex`
- bundled `tectonic` via `node-latex-compiler`

`LATEX_CMD` only selects a system command to execute. It does not install `pdflatex` or `xelatex`.

## Vercel

Vercel serverless functions do not include a TeX Live system install, so calling `pdflatex` directly fails with:

```text
spawn pdflatex ENOENT
```

For Vercel, use the bundled Tectonic renderer:

```env
LATEX_RENDERER=tectonic
```

Do not set `LATEX_CMD=pdflatex` on Vercel unless you intentionally want to test the missing system binary path.

Tectonic is a real LaTeX engine. The first cold compile can be slower because packages may be initialized/downloaded by the engine.

On Vercel this repository installs the official Linux musl Tectonic binary during `postinstall` into `vendor/tectonic-linux-x64/bin`. The musl binary avoids GLIBC version problems in Vercel serverless functions.

## Docker/VPS

The included `Dockerfile` installs TeX Live packages required for the PDF renderer. In Docker production, prefer:

```env
LATEX_RENDERER=auto
LATEX_CMD=xelatex
```

## Modes

```env
# Try system pdflatex/xelatex, then Tectonic fallback.
LATEX_RENDERER=auto

# Use only pdflatex/xelatex from the server.
LATEX_RENDERER=system

# Use bundled Tectonic only. Recommended for Vercel.
LATEX_RENDERER=tectonic
```

If `LATEX_RENDERER=system`, the production runtime must have `pdflatex` or `xelatex` installed.

Check runtime readiness with:

```text
/api/health
```

The `latex.available` field must be `true` before PDF export can work.

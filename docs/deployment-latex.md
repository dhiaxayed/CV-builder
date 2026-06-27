# LaTeX PDF deployment

PDF export is intentionally LaTeX-only. The app generates `.tex`, compiles it with a real LaTeX engine, and returns the compiled PDF.

## Required runtime

The production runtime must have one of these commands installed:

- `pdflatex`
- `xelatex`

`LATEX_CMD` only selects the command to execute. It does not install LaTeX.

## Vercel limitation

Vercel serverless functions do not include a TeX distribution by default, so PDF export fails with:

```text
spawn pdflatex ENOENT
```

That error means the server cannot find the LaTeX executable. It is not a CV template issue.

For production PDF export, use one of these real LaTeX runtimes:

- Deploy this app with the included `Dockerfile`, which installs TeX Live.
- Deploy a separate PDF worker/container with TeX Live and call it from the app.
- Use a server/VPS where TeX Live or MiKTeX is installed and set `LATEX_CMD` if needed.

## Docker deployment

The included `Dockerfile` installs TeX Live packages required for the PDF renderer. In Docker production, prefer:

```env
LATEX_CMD=xelatex
```

Check runtime readiness with:

```text
/api/health
```

The `latex.available` field must be `true` before PDF export can work.

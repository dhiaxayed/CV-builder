# Docker Production Guide

## 1) Prepare environment
1. Copy `.env.production.example` to `.env.production`.
2. Fill all variables with production values.
3. Do not commit `.env.production`.

## 2) Build and run
```bash
docker compose up -d --build
```

App will be available on port `3001` by default.

## 3) Logs and lifecycle
```bash
docker compose logs -f cv-builder-app
docker compose restart cv-builder-app
docker compose down
```

## 4) Notes for PDF export
- The image includes `xelatex` and fallback `pdflatex` dependencies.
- API route `/api/pdf` compiles LaTeX server-side, so these binaries must exist at runtime.

## 5) Reverse proxy (recommended)
Put Nginx/Caddy/Traefik in front of the container and terminate TLS there.

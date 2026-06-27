# Docker Deployment Guide

This project includes a production-ready Docker image with LaTeX installed (`xelatex`, `pdflatex`) for template-accurate PDF export.

## Option A: Local smoke test

1. Copy `.env.production.example` to `.env.production` and fill required vars.
2. Start only the app container:

```bash
docker compose up -d --build
```

3. Check:

```bash
docker compose logs -f cv-builder-app
curl http://localhost:3001/api/health
docker exec -it cv-builder-app xelatex --version
```

## Option B: Production with HTTPS (recommended)

Use `docker-compose.prod.yml` + Caddy for automatic TLS.

### 1) Server prerequisites
- Linux VPS with Docker + Docker Compose plugin installed
- DNS `A` record from your domain to server IP
- Ports `80` and `443` open on firewall/security group

### 2) Environment

Copy and edit:

```bash
cp .env.production.example .env.production
```

Set at least:
- `NEXT_PUBLIC_APP_URL=https://your-domain.com`
- `DOMAIN=your-domain.com`
- `ACME_EMAIL=admin@your-domain.com`
- Supabase keys
- SMTP / email provider vars
- OpenRouter vars

### 3) Deploy

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4) Validate runtime

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f cv-builder-app
docker compose -f docker-compose.prod.yml logs -f cv-builder-caddy
curl https://your-domain.com/api/health
docker exec -it cv-builder-app xelatex --version
```

### 5) Update to a new release

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### 6) Rollback

```bash
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes for PDF export
- `/api/pdf` uses LaTeX first for exact templates.
- If LaTeX is unavailable at runtime, app falls back to compatibility PDF mode.
- In this Docker image, LaTeX is installed by default, so fallback should be rare.

# Vercel Deployment Guide

## 1) Push repository
Push your code to GitHub, GitLab, or Bitbucket.

## 2) Import project on Vercel
1. Open Vercel dashboard.
2. Click "Add New" -> "Project".
3. Import this repository.
4. Framework preset: Next.js.

## 3) Build settings
- Build command: `pnpm build`
- Output directory: leave empty (Next.js default)
- Install command: `pnpm install --frozen-lockfile`

## 4) Environment variables (required)
Set these in Vercel Project Settings -> Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXT_PUBLIC_APP_URL` (your Vercel domain or custom domain)
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `EMAIL_PROVIDER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## 5) Important runtime notes
- AI routes are configured with `maxDuration = 60`.
- PDF export supports a LaTeX-first path and automatically falls back to a pure JavaScript PDF generator when LaTeX binaries are unavailable (common on serverless).

## 6) Domain and auth
After attaching a custom domain, update `NEXT_PUBLIC_APP_URL` to the final HTTPS URL and redeploy.

## 7) Post-deploy smoke tests
- Sign in flow works.
- Create CV works.
- Save + Version works.
- PDF, LaTeX, JSON downloads work.
- Share link works.

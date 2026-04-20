# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Runtime packages required for PDF generation via LaTeX.
RUN apt-get update \
    ; apt-get install -y --no-install-recommends \
      ca-certificates \
      tini \
      texlive-xetex \
      texlive-latex-extra \
      texlive-fonts-recommended \
      fonts-dejavu \
      fonts-liberation \
    ; rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 nodejs \
    ; useradd --uid 1001 --gid 1001 --create-home nextjs

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

USER nextjs
EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "start"]

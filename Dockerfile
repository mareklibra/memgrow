# syntax=docker/dockerfile:1

# ---- deps: install dependencies (with native build tooling for bcrypt/sharp) ----
FROM node:24-bookworm-slim AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: build the Next.js app ----
FROM node:24-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BUILD_COMMIT=unknown
ARG NEXT_PUBLIC_BUILD_TIME=unknown
ENV NEXT_PUBLIC_BUILD_COMMIT=${NEXT_PUBLIC_BUILD_COMMIT}
ENV NEXT_PUBLIC_BUILD_TIME=${NEXT_PUBLIC_BUILD_TIME}
# next build's page-data collection imports every route module, including
# ones that import app/lib/db.ts, which throws if POSTGRES_URL is unset at
# all (it does not actually connect at construction time). No real database
# is reachable during an image build, so a placeholder is enough - the real
# value is supplied at container runtime via compose.yml/Quadlet units.
ENV DB_PROVIDER=pg
ENV POSTGRES_URL=postgresql://build:build@localhost:5432/build
RUN pnpm exec next build

# ---- runner: minimal production image ----
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/false --create-home nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

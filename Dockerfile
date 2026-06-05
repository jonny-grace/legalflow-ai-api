# ── Stage 1: Dependencies ────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY tsconfig.json ./

RUN npm ci

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# ── Stage 2: Builder ─────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./
COPY --from=deps /app/tsconfig.json ./

# Copy source
COPY src ./src
COPY nest-cli.json ./
COPY package*.json ./

# Build — dummy URL needed because prisma.config.ts is present
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run build

# Show what was built
RUN echo "=== dist/ ===" && find dist -name "*.js" | head -20

# ── Stage 3: Production Runner ────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY package*.json ./

COPY scripts/entrypoint.sh ./scripts/entrypoint.sh

RUN chown -R nestjs:nodejs /app
RUN chmod +x ./scripts/entrypoint.sh

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["./scripts/entrypoint.sh"]
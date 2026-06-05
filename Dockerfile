# ─────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./

RUN npm ci

# Prisma generate (safe dummy env)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate


# ─────────────────────────────────────────────
# Stage 2: Builder
# ─────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npm run build

RUN echo "=== dist output ===" && find dist -name "*.js" | head -20


# ─────────────────────────────────────────────
# Stage 3: Production Runner (FIXED PRISMA HERE)
# ─────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production

# create user (security best practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# install production dependencies ONLY
COPY package*.json ./
RUN npm ci --omit=dev

# IMPORTANT: copy prisma schema FIRST
COPY prisma ./prisma

# 🔥 FIX: generate Prisma client in production stage
RUN npx prisma generate

# copy built application
COPY --from=builder /app/dist ./dist

# optional runtime config
COPY prisma.config.js ./

# entrypoint
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x ./scripts/entrypoint.sh

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001

# healthcheck (Render compatible)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["./scripts/entrypoint.sh"]
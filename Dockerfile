# ============================================================
# LegalFlow AI API — Dockerfile
# Multi-stage build for optimized production image
# ============================================================

# ── Stage 1: Dependencies ────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies including devDependencies
# We need @nestjs/cli from devDeps to build
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ── Stage 2: Builder ─────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy all source files
COPY . .

# Build using nest build (via npm run build)
RUN npm run build

# Verify the build produced main.js
RUN test -f dist/main.js && echo "✅ Build successful" || (echo "❌ dist/main.js missing" && exit 1)

# ── Stage 3: Production Runner ────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

WORKDIR /app

ENV NODE_ENV=production

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node dist/main"]
# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:22-alpine AS deps

WORKDIR /app

# Install libc6-compat for alpine compatibility and bun
RUN apk add --no-cache libc6-compat \
    && npm install -g bun

# Copy package files
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ============================================================
# Stage 2: Build the application
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install bun for build step
RUN npm install -g bun

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client (dummy URL — only needed for schema parsing, not connection)
RUN DIRECT_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bunx prisma generate

# Build Next.js in standalone mode (dummy env vars — no DB at build time)
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    DIRECT_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    BETTER_AUTH_SECRET="build-placeholder" \
    BETTER_AUTH_URL="http://localhost:3000" \
    bun run build

# ============================================================
# Stage 3: Production runner
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install sharp for image processing (production dependency)
RUN apk add --no-cache libc6-compat \
    && npm install --os=linux --cpu=x64 sharp@0.34 \
    && rm -rf /root/.npm

# Create non-root user (GID 1000 may already exist in alpine)
RUN addgroup --system nodejs 2>/dev/null || true \
    && adduser --system --ingroup nodejs nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma generated client (Prisma 7 outputs to ./generated/prisma/)
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated

# Copy MDX content directory (blog posts stored in git)
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

# Create writable directories for Next.js cache
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next/cache

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

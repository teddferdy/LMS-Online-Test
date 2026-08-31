# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json yarn.lock ./
COPY apps/backend/package.json apps/web/package.json ./apps/
COPY apps/backend ./apps/backend 2>/dev/null || true

# Install all workspace deps (yarn 1 classic, hoisted to root node_modules)
RUN mkdir -p apps/backend && yarn install --frozen-lockfile

# Copy source (after install so source changes don't bust cache)
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# Generate prisma client (into root node_modules via hoisting)
RUN npx prisma generate

# Build nest
RUN npx nest build

# ---- Runtime stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json yarn.lock ./
COPY apps/backend ./apps/backend
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3000

# Run database migrations, then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

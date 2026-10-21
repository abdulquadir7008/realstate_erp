# ---- Build & run the NestJS API inside the pnpm monorepo ----
FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /app

# ---- Dependencies (workspace-aware, cached) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @re/shared build \
 && pnpm --filter @re/api exec prisma generate \
 && pnpm --filter @re/api build

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 4010
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma && node apps/api/dist/apps/api/src/main.js"]

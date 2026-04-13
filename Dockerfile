FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# ─── Install deps ───────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-spec/package.json           lib/api-spec/
COPY lib/db/package.json                 lib/db/
COPY artifacts/api-server/package.json   artifacts/api-server/
COPY artifacts/project-mgmt/package.json artifacts/project-mgmt/
RUN pnpm install --frozen-lockfile

# ─── Build frontend ─────────────────────────────────────────────────────────
FROM deps AS frontend-build
COPY lib/ lib/
COPY artifacts/project-mgmt/ artifacts/project-mgmt/
# BASE_PATH=/ means the SPA is served from the root path
ENV BASE_PATH=/ PORT=3000 NODE_ENV=production
RUN pnpm --filter @workspace/project-mgmt run build

# ─── Build API server ───────────────────────────────────────────────────────
FROM deps AS api-build
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
RUN pnpm --filter @workspace/api-server run build

# ─── Final runtime image ─────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-spec/package.json           lib/api-spec/
COPY lib/db/package.json                 lib/db/
COPY artifacts/api-server/package.json   artifacts/api-server/
COPY artifacts/project-mgmt/package.json artifacts/project-mgmt/
RUN pnpm install --frozen-lockfile --prod

# Copy built assets
COPY --from=api-build      /app/artifacts/api-server/dist      artifacts/api-server/dist
COPY --from=frontend-build /app/artifacts/project-mgmt/dist    artifacts/project-mgmt/dist

EXPOSE 8080
ENV PORT=8080 NODE_ENV=production

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

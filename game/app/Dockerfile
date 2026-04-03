FROM oven/bun:1.2.22-alpine AS builder
WORKDIR /repo

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY game/app/package.json game/app/bun.lock ./game/app/
WORKDIR /repo/game/app
RUN bun install --frozen-lockfile

WORKDIR /repo
COPY game ./game
RUN bun run --cwd game/app build

FROM nginx:1.29-alpine AS runner

COPY --from=builder /repo/game/app/dist /usr/share/nginx/html
COPY --from=builder /repo/game/app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

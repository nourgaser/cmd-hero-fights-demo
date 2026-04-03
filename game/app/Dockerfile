FROM oven/bun:1.2.22-alpine AS builder
WORKDIR /game

COPY app/package.json app/bun.lock ./app/
WORKDIR /game/app
RUN bun install --frozen-lockfile

WORKDIR /game
COPY . .
RUN bun run --cwd app build

FROM nginx:1.29-alpine AS runner

COPY --from=builder /game/app/dist /usr/share/nginx/html
COPY --from=builder /game/app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@12.14.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 SANDBOX_URL=http://127.0.0.1:8787
RUN pnpm build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 UPLOAD_DIR=/data/uploads
COPY --from=build --chown=node:node /app /app
# Profile photos. Mount a volume here so uploads survive redeploys:
#   docker run -v phishout-uploads:/data/uploads ...
RUN mkdir -p /data/uploads && chown -R node:node /data
VOLUME ["/data/uploads"]
USER node
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"]

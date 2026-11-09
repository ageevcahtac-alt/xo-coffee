# syntax=docker/dockerfile:1

# deps — install exactly what package-lock.json pins
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# builder — full Next.js build (output: "standalone", see next.config.ts)
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# runner — only the standalone server, its static assets and public/
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
# /data is the snapshot volume mount (docker-compose.yml: xo-data:/data);
# created and owned by the runtime user so the snapshot stays writable
RUN mkdir -p /data && chown node:node /data
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --spider http://localhost:3000/ || exit 1
CMD ["node", "server.js"]

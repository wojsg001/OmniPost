FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TZ=Asia/Shanghai
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S omnipost && adduser -S omnipost -G omnipost
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p /app/data/uploads && chown -R omnipost:omnipost /app
USER omnipost
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:24-alpine AS deps
WORKDIR /app
ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
  npm config set registry "$NPM_CONFIG_REGISTRY" \
  && npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 120000 \
  && npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://fy_user:change_me@db:5432/fy_site?schema=public
ENV NEXTAUTH_SECRET=build-time-secret
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_DIST_DIR=.next-final
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=deps --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/.next-final/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next-final/static ./.next-final/static
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nextjs /app/prisma.config.ts ./prisma.config.ts
RUN mkdir -p /app/public/uploads \
  && chown -R nextjs:nextjs /app/public/uploads /app/node_modules/.prisma /app/node_modules/@prisma /app/node_modules/prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

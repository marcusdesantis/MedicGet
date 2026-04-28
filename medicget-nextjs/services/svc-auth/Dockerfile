FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY services/svc-auth/package.json services/svc-auth/
COPY packages/shared/package.json packages/shared/
RUN npm install --workspaces --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build -w services/svc-auth

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/services/svc-auth/.next ./services/svc-auth/.next
COPY --from=builder /app/services/svc-auth/package.json ./services/svc-auth/
COPY --from=builder /app/services/svc-auth/next.config.ts ./services/svc-auth/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 4001
CMD ["npm", "run", "start", "-w", "services/svc-auth"]

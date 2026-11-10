# --- Construction ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Exécution ---
FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/data ./src/data
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4321/healthz >/dev/null || exit 1
CMD ["node", "./dist/server/entry.mjs"]

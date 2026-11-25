#crear base pnpm y los manifiestos
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm
COPY package.json ./

#dependencias de desarrollo
FROM base AS deps-dev
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# dependencias de produccion
FROM base AS deps-prod
RUN pnpm install --no-frozen-lockfile --prod --ignore-scripts

#pruebas
FROM deps-dev AS test
ENV NODE_ENV=test
COPY . .
CMD ["npx", "jest", "--testEnvironment=node", "--forceExit"]

#produccion
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps-prod /app/node_modules ./node_modules
COPY package.json server.js db.js util.js configurador.js ./
COPY routes ./routes
COPY services ./services
COPY scripts ./scripts

# no corre como root
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/productos/categorias > /dev/null || exit 1

CMD ["node", "server.js"]

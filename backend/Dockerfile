#crear base pnpm y los manifiestos
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm
COPY package.json ./

#dependencias de desarrollo
FROM base AS deps-dev
RUN pnpm install --no-frozen-lockfile --ignore-scripts

#dependencias de produccion
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

USER node
EXPOSE 3000

CMD ["node", "server.js"]

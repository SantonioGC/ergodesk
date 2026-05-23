FROM node:22-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY package.json ./
RUN pnpm install --no-frozen-lockfile --ignore-scripts
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]

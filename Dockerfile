# Server-Funktionen der TTC-App (api/*.js) als Container für Google Cloud Run
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY api ./api
COPY server ./server
EXPOSE 8080
CMD ["node", "server/index.mjs"]

# Micro-service sans base de données : une seule image, aucun volume nécessaire
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY src ./src
COPY public ./public

# Exécution avec un utilisateur non-root
USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health | grep -q UP || exit 1

CMD ["node", "src/server.js"]

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production

# IMPORTANTE: escuchar en process.env.PORT y en 0.0.0.0 (ver
# src/index.ts) — no hardcodear el puerto ni el host, o el
# proveedor de hosting (Railway u otro) no podrá conectarse al
# contenedor aunque esté corriendo.
CMD ["node", "dist/index.js"]

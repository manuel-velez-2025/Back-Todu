FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Corre migraciones antes de levantar el servidor
CMD ["sh", "-c", "npm run migrate && node dist/index.js"]
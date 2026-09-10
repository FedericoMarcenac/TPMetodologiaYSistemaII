FROM node:24-alpine

WORKDIR /app

# Se copian package.json y package-lock.json primero: si no cambian, Docker reutiliza
# la capa de dependencias y no vuelve a instalar en cada build.
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]

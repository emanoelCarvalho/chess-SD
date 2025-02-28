# Etapa de build
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de produção (sem NGINX, usando serve)
FROM node:18-alpine AS production-stage
WORKDIR /app
COPY --from=build-stage /app/dist ./
RUN npm install -g serve
CMD ["serve", "-s", "."]

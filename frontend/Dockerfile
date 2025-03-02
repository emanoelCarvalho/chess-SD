FROM node:18-alpine AS production-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Servir os arquivos gerados na pasta dist
FROM nginx:alpine
COPY --from=production-stage /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

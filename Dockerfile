FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY client/package.json client/package-lock.json ./client/
COPY server/package.json server/package-lock.json ./server/

RUN npm ci --prefix client
RUN npm ci --prefix server

COPY . .

RUN npm --prefix client run build
RUN npm --prefix server run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src ./server/src

EXPOSE 5000

CMD ["node", "server/dist/server.js"]

FROM nginx:1.27-alpine AS web

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

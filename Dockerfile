# Imagem única: a API serve também o front compilado (mesma origem, sem CORS).
#   docker build -t devdesk .
#   docker run -p 3333:3333 --env-file .env.production devdesk

FROM node:26-alpine AS build
WORKDIR /app
# Primeiro só os manifestos: a instalação fica em cache enquanto eles não mudam.
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM node:26-alpine
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    WEB_DIST_DIR=/app/apps/web/dist
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/drizzle apps/api/drizzle
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
EXPOSE 3333
# As migrações rodam sozinhas quando a API sobe.
CMD ["node", "apps/api/dist/main.js"]

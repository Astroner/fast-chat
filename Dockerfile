FROM node:16-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

RUN npm run build

RUN rm -rf src

ENV PORT=80
ENV NODE_ENV=PRODUCTION
ENV MAX_ROOMS=20

EXPOSE 80

CMD ["node", "dist/index"]
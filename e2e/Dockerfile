FROM node:alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm@10.7.0

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

CMD ["pnpm", "test"]
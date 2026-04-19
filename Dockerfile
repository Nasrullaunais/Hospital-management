FROM node:22-alpine

WORKDIR /app/server

RUN apk add --no-cache curl bash && \
    curl -fsSL https://bun.sh/install | bash

ENV BUN_INSTALL=/root/.bun
ENV PATH=${BUN_INSTALL}/bin:${PATH}

COPY server/package.json server/bun.lockb* ./

RUN bun install

WORKDIR /app
COPY . .

WORKDIR /app/server

CMD ["sh", "-c", "bun run dev"]
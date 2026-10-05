FROM oven/bun:1.4-slim AS deps
WORKDIR /app
ENV NODE_ENV=development

COPY package.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma

RUN bun install
RUN bun run db:generate && test -f src/generated/prisma/client.ts

FROM oven/bun:1.4-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated

COPY package.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN sed -i 's/\r$//' ./docker/entrypoint.sh \
 && chmod +x ./docker/entrypoint.sh \
 && mkdir -p /data

VOLUME ["/data"]

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["bun", "run", "start"]
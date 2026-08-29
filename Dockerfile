FROM oven/bun:1.3.14

WORKDIR /app
COPY . .

RUN bun install --frozen-lockfile
# generate never connects; the real DATABASE_URL comes from the runtime env
RUN DATABASE_URL="postgresql://placeholder" bun run --cwd packages/database db:generate

CMD ["bun", "run", "packages/server/src/index.ts"]

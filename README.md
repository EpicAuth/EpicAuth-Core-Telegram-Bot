# Epicauth Seller Telegram Bot

A Telegram bot that drives the [Epicauth](https://Epicauth.cc) seller API. Each command
or inline button maps to one seller endpoint; the bot keeps its own small database of
which seller keys you have added and which one is currently active.

## Requirements

- [Bun](https://bun.sh) 1.4+
- A bot token from [@BotFather](https://t.me/botfather)

## Setup

```bash
cp .env.example .env      # then fill in TELEGRAM_API_KEY
bun install
bun run db:migrate        # creates prisma/epicauth.db and applies migrations
bun run start
```

Then send `/setseller` to the bot and add your seller key.

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run start` | Run the bot |
| `bun run dev` | Run with hot reload |
| `bun run db:migrate` | Create/apply a migration from `prisma/schema.prisma` |
| `bun run db:deploy` | Apply existing migrations (production) |
| `bun run db:studio` | Browse the database |
| `bun run db:generate` | Regenerate the Prisma client |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test:store` | Exercise the Prisma data layer |
| `bun run test:loader` | Verify every command/button module loads |

`bun install` runs `prisma generate` automatically. If you ever run `prisma migrate dev`
you must run `bun run db:generate` yourself — Prisma 7 no longer does it for you.

## Docker

```bash
cp .env.example .env        # set TELEGRAM_API_KEY
docker compose up -d --build
docker compose logs -f
```

`docker-compose.yaml` runs one `bot` service. The SQLite file lives on a named volume
(`bot-data`) mounted at `/data`, so it survives rebuilds and container replacement.

### Two different DATABASE_URL values, on purpose

| Where | Value | Meaning |
| --- | --- | --- |
| `.env` | `file:./prisma/epicauth.db` | relative to the project root, used when you run `bun run start` locally |
| `docker-compose.yaml` | `file:/data/epicauth.db` | absolute, inside the container, on the volume |

Compose does not copy `.env` into the container. It only expands `${VARIABLES}` that
appear in the compose file, and `DATABASE_URL` is written as a literal — so the
container always uses `/data/epicauth.db` regardless of what `.env` says. Both the bot
and the `prisma migrate deploy` step read that same variable, so they cannot disagree.

Changing the in-container location means editing `docker-compose.yaml`, not `.env`.

| Setting | Why |
| --- | --- |
| `DATABASE_URL: file:/data/epicauth.db` | points both the CLI and the runtime at the volume |
| `init: true` | PID 1 is `tini`, so SIGTERM reaches the app and the Prisma client disconnects cleanly |
| `stop_grace_period: 20s` | gives the graceful shutdown room to finish |
| `restart: unless-stopped` | survives host reboots and crashes |
| `${TELEGRAM_API_KEY:?...}` | Compose refuses to start if the token is missing instead of failing at runtime |

The entrypoint runs `prisma migrate deploy` before starting the bot, so the schema is
always current and you never hand-apply SQL. Because `src/generated` is gitignored, the
image runs `prisma generate` during the build — it is an explicit `RUN` step, not left to
the `postinstall` hook.

Common commands:

```bash
docker compose logs -f          # follow logs
docker compose restart          # restart
docker compose down             # stop, keep the database
docker compose down --volumes   # stop and delete the database
```

Note for Windows contributors: `docker/entrypoint.sh` is checked out with CRLF by default,
which makes Linux reject the shebang. The build strips carriage returns, and
`.gitattributes` pins `*.sh` to LF so git never stores it that way again.

## Database

Storage is **Prisma 7.9.1** on SQLite. Migrations live in `prisma/migrations` and are
committed, so a fresh clone only needs `bun run db:migrate`.

The driver is `@prisma/adapter-libsql` rather than `@prisma/adapter-better-sqlite3`.
`better-sqlite3` is a Node native module and its bindings fail to load under Bun
(`ERR_DLOPEN_FAILED`, [bun#4290](https://github.com/oven-sh/bun/issues/4290)). The libSQL
adapter ships prebuilt binaries and works on Bun, Node, and the edge, and reads the same
`file:` URLs. If you would rather run on Node, swapping the adapter is a two-line change
in `src/utilities/db.ts`.

Connection string comes from `DATABASE_URL` and defaults to `file:./prisma/epicauth.db`.

### Schema

| Model | Holds |
| --- | --- |
| `Application` | Seller keys you added, with a local label |
| `ActiveApplication` | Which application is selected right now |
| `LicenseMask` | Last key layout you used, per application |

`Application` is unique on `(telegramUserId, sellerKey)` and indexed on `telegramUserId`,
which is the only access pattern the bot has — so every lookup is a single index seek.
Telegram IDs are stored as `TEXT` to stay clear of 32-bit overflow.

## Layout

```
src/
  commands/       one file per command, named by the file
  buttons/        one file per callback button
  interfaces/     Command and Button shapes
  utilities/
    api.ts        typed seller API client
    bot.ts        loader, dispatcher, cooldowns
    conversation.ts per-user multi-step conversations
    db.ts         Prisma client singleton
    logger.ts     console logger
    reply.ts      reply + MarkdownV2 helpers
    seller.ts     resolves the active seller key
    session.ts    legacy Request()/GetSellerKey() shim
    state.ts      legacy stateManager shim
```

### Writing a command

```ts
import { type Execute } from "../interfaces/Command";
import { seller } from "../utilities/api";
import { done, ensure } from "../utilities/reply";
import { resolveSellerKey } from "../utilities/seller";

export const name = "pauseapp";
export const description = "Pause the application.";

export const execute: Execute = async (ctx) => {
  const sellerKey = await resolveSellerKey(ctx);
  if (!sellerKey) return;

  if (await ensure(ctx, await seller.pauseApp(sellerKey))) {
    await ctx.reply(done("Application paused."));
  }
};
```

`ensure()` returns the response payload, or `null` after replying with the API error — so
there is no repeated `if (!response.success)` block.

### Writing a conversation

`conversations.start()` takes a list of steps. `steps[0]` is the opening prompt, each later
step consumes one user message, `session.next()` advances, and `session.finish()` ends it.

```ts
await conversations.start(ctx, {
  sellerKey,
  steps: [
    async (step) => step.reply("Which channel should I create?"),
    async (step, session) => {
      const name = readText(step);
      if (!name) return step.reply("Send a name.");

      session.set("name", name);
      session.next();
    },
  ],
});
```

Conversations are keyed by Telegram user id, so two people can run the same flow at the
same time without colliding. This replaces the module-level `let sellerKey = ""` variables
the earlier version used, which were shared across every user of the process.

## Configuration

`src/config.ts` toggles module loading, console logging verbosity, the API base URL and
timeout, and the conversation timeout.

## Licence

Released under the **Elastic License 2.0** — full text in [LICENSE](LICENSE).

The restrictions that actually affect you as a user:

* you may not offer it to third parties as a hosted or managed service
* you may not remove, disable, or work around its licence-key functionality
* you may not remove or obscure the licensor's notices, and anyone you hand a copy to
  must receive these terms as well
* if you modify it, your modified copies must say that you modified them

Note that ELv2 is source-available, not open source — it was never approved by the OSI.
The full terms are deliberately short; read [LICENSE](LICENSE) before relying on it.
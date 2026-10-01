# CodeFlow

CodeFlow is a terminal-based AI coding assistant. It provides an interactive
command-line interface for working with large language models directly inside a
project, with two distinct modes of operation: a read-only planning mode for
analysis and design, and a build mode for making changes to the codebase.

The application is built with Bun, React (rendered to the terminal via OpenTUI),
and Hono, and persists conversation history in PostgreSQL through Prisma.

[![CodeFlow demo: type a prompt, Tab to Plan, Tab to Build, then switch themes](docs/launch.webp)](docs/launch.mp4)

*23 seconds: Plan, then Build, then 32 themes. [Watch with sound.](docs/launch.mp4)*

## Installation

CodeFlow requires [Bun](https://bun.sh/) to be installed.

Install the CLI globally from npm:

```bash
npm install -g codeflow-ai
```

Then run it from any project directory:

```bash
codeflow
```

No additional configuration is required. The published CLI ships with the
production server and authentication settings built in, so the first run will
prompt you to sign in and then start an interactive session.

## Usage

Running `codeflow` launches an interactive terminal interface where you converse
with the assistant. Two modes are available:

- **Plan** — Read-only analysis. The assistant can read files, search the
  codebase, and propose changes, but cannot modify anything. Use this for
  exploring an unfamiliar codebase, reviewing architecture, or designing an
  approach before implementing it.
- **Build** — Implementation. The assistant can create and edit files and run
  shell commands in addition to all read-only capabilities. Use this to carry
  out changes.

Conversation history is persisted, so sessions can be revisited and continued.

## Architecture

![CodeFlow architecture](docs/architecture.svg)

An interactive version of this diagram — with guided views, relationship
tracing, and links to the source files behind each component — is available at
[`docs/architecture.html`](docs/architecture.html); open it in a browser.

Four companion diagrams cover the system from other angles. Each has an
interactive HTML version alongside it.

### Assistant turn

A prompt moving through the auth and credit gates, the model, the local tool
loop, and persistence — plus the paths that reject a turn before any tokens are
spent. Interactive: [`docs/workflow.html`](docs/workflow.html)

![CodeFlow assistant turn](docs/workflow.svg)

### Sign-in sequence

The OAuth 2.0 and PKCE exchange between the CLI, the loopback listener it opens
on a random port, the browser, and Clerk. Interactive:
[`docs/sequence.html`](docs/sequence.html)

![CodeFlow sign-in sequence](docs/sequence.svg)

### Session data flow

Where a message goes: shared Zod validation, the assembled turn, the Postgres
JSON column, and token usage becoming billable credits. Interactive:
[`docs/dataflow.html`](docs/dataflow.html)

![CodeFlow session data flow](docs/dataflow.svg)

### Session lifecycle

The states a session moves through, including suspension while a tool runs
locally and recovery from a failed turn. Interactive:
[`docs/lifecycle.html`](docs/lifecycle.html)

![CodeFlow session lifecycle](docs/lifecycle.svg)

### Packages

CodeFlow is a monorepo managed with Bun workspaces:

```
packages/
  cli/        Terminal UI client (React + OpenTUI)
  server/     HTTP API and model orchestration (Hono, AI SDK)
  database/   Prisma schema and generated client
  shared/     Shared Zod schemas, types, and model definitions
```

- **CLI** renders the interactive terminal interface and communicates with the
  server over HTTP, consuming streamed responses via Server-Sent Events.
- **Server** exposes the REST/SSE API, orchestrates model calls through the AI
  SDK (OpenAI and Anthropic providers), enforces the tool set permitted by the
  current mode, and reads and writes session state.
- **Database** stores sessions and message history.
- **Shared** holds the Zod schemas and TypeScript types used as the contract
  between the CLI, the server, and the database.

## Data model

Sessions are the primary persisted entity:

| Field       | Type          | Description                                  |
| ----------- | ------------- | -------------------------------------------- |
| `id`        | `String` (CUID) | Unique session identifier                  |
| `title`     | `String`      | Human-readable session title                 |
| `messages`  | `Json`        | Ordered message objects (role, content, tools) |
| `createdAt` | `DateTime`    | Creation timestamp                           |
| `updatedAt` | `DateTime`    | Last modification timestamp                  |

## Tools

The assistant operates through a fixed set of tools, defined and validated in
`packages/shared/src/schemas.ts`. The available tools depend on the active mode.

Available in both Plan and Build modes:

- `readFile` — read a file's contents
- `listDirectory` — list directory entries
- `glob` — match files by pattern
- `grep` — search file contents

Available in Build mode only:

- `writeFile` — create or overwrite a file
- `editFile` — replace a string within a file
- `bash` — run a shell command

## Local development

Running your own instance requires the backend and database in addition to the
CLI.

### Prerequisites

- Bun
- A PostgreSQL database
- API keys for the model providers you intend to use (OpenAI and/or Anthropic)

### Backend setup

1. Copy `.env.example` to `.env` and fill in the required values (database URL,
   provider API keys, and authentication credentials).
2. Generate the Prisma client and apply the schema:

   ```bash
   bun run --cwd packages/database db:generate
   bunx prisma db push --schema packages/database/prisma/schema.prisma
   ```

3. Start the server:

   ```bash
   bun run dev:server
   ```

### CLI development

Point the CLI at your local server and run it in watch mode:

```bash
export API_URL=http://localhost:3000
bun run dev:cli
```

The CLI's built-in production defaults can be overridden with the `API_URL`,
`CLERK_FRONTEND_API`, and `CLERK_OAUTH_CLIENT_ID` environment variables (set in
your shell or a `.env` file in the working directory) to target your own server
and authentication instance.

To build and symlink the CLI locally so the `codeflow` command runs your working
copy:

```bash
bun run link:cli
```

## Scripts

From the repository root:

- `bun run dev:server` — start the API server in watch mode
- `bun run dev:cli` — start the terminal interface in watch mode
- `bun run build:cli` — build the CLI bundle
- `bun run link:cli` — build and symlink the CLI for local use

## Tech stack

- **Runtime:** Bun
- **CLI:** React, OpenTUI, React Router
- **Server:** Hono, AI SDK (OpenAI and Anthropic providers), Zod
- **Database:** Prisma, PostgreSQL
- **Authentication and billing:** Clerk, Polar

## License

MIT

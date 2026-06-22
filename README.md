# Codeflow

Codeflow is a terminal-based AI coding assistant built with Bun, Hono, React, and Prisma. It provides an interactive CLI experience for chatting with an LLM in either **PLAN** mode or **BUILD** mode, while persisting sessions and messages in PostgreSQL.

## Features

- Terminal UI powered by React + OpenTUI
- Streaming chat responses over SSE
- Support for multiple AI models/providers
- Two operation modes:
  - **PLAN** — read-only analysis and planning
  - **BUILD** — implementation mode with file editing and shell tools
- Session history stored in PostgreSQL
- Shared types and validation schemas across server and CLI
- Tooling for codebase exploration and editing:
  - read files
  - list directories
  - search with grep
  - glob matching
  - write/edit files
  - run shell commands

## Project Structure

```txt
packages/
  cli/        # Terminal UI client
  server/     # Hono API server and AI orchestration
  database/   # Prisma schema, generated client, DB access
  shared/     # Shared models, schemas, and types
```

## How it works

### CLI
The CLI app is the main user interface. It renders a terminal-based experience with screens for:

- Home
- Creating a new session
- Viewing and continuing an existing session

### Server
The server exposes REST/SSE routes for:

- `GET /sessions`
- `GET /sessions/:id`
- `POST /sessions`
- `POST /chat/:sessionId`
- `POST /chat/:sessionId/resume`

It:
- stores sessions/messages in the database,
- streams model responses to the CLI,
- enables tool calling in BUILD mode,
- supports resuming interrupted assistant responses.

### Database
The database package uses Prisma with PostgreSQL and contains:

- `Session`
- `Message`

Messages support:
- `USER`
- `ASSISTANT`
- `ERROR`

Session modes include:
- `PLAN`
- `BUILD`

## Requirements

- [Bun](https://bun.sh/)
- PostgreSQL database
- API keys for supported model providers:
  - OpenAI
  - Anthropic

## Installation

```bash
bun install
```

## Configuration

Create a `.env` file for the server/database packages with the required environment variables.

Example:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/codeflow
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

> Exact environment variable names may depend on the provider setup in the server implementation.

## Database Setup

Generate the Prisma client:

```bash
bun run --cwd packages/database db:generate
```

If you have Prisma migrations or a database reset workflow, run those as needed for your environment.

## Development

Run the server:

```bash
bun run dev:server
```

Run the CLI:

```bash
bun run dev:cli
```

## Scripts

From the root package:

- `bun run dev:server` — start the API server in watch mode
- `bun run dev:cli` — start the terminal UI in watch mode

From `packages/server`:

- `bun run dev`
- `bun run build`
- `bun run postinstall`

From `packages/database`:

- `bun run db:generate`

From `packages/cli`:

- `bun run dev`

## Modes

### PLAN
Read-only mode for:
- analyzing the codebase
- proposing changes
- exploring files and directories
- discussing tradeoffs

Available tools:
- readFile
- listDirectory
- glob
- grep

### BUILD
Implementation mode for:
- making code changes
- editing files
- running commands
- verifying changes

Available tools:
- readFile
- writeFile
- editFile
- listDirectory
- glob
- grep
- bash

## Tech Stack

- Bun
- TypeScript
- Hono
- React
- OpenTUI
- Prisma
- PostgreSQL
- Zod
- AI SDK
- OpenAI / Anthropic providers

## Notes

- The CLI communicates with the server using streaming SSE events.
- Conversation history is persisted, including interrupted assistant messages.
- The system prompt is tailored to the current mode and working directory.

## License

Add your license here.

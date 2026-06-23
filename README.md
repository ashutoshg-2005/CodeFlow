# 🚀 CodeFlow

CodeFlow is a high-performance, terminal-based AI coding assistant built with **Bun**, **React (OpenTUI)**, and **Hono**. It enables a seamless interactive CLI experience for AI-native development, allowing you to **PLAN** complex architectures or **BUILD** directly in your environment.

---

## ✨ Features

- 🖥️ **Interactive Terminal UI**: Built with React and OpenTUI for a modern, fluid CLI experience.
- 🌊 **Streaming SSE Chat**: Real-time communication between CLI and Server using Server-Sent Events.
- 🏗️ **Dual Operational Modes**:
  - **PLAN**: Read-only exploration. Analyze codebases, propose designs, and explore files safely.
  - **BUILD**: Implementation mode. Edit files, run shell commands, and execute your plan.
- 💾 **Session Persistence**: Complete session history stored in PostgreSQL via Prisma.
- 🛠️ **Powerful Tooling**: Full access to the filesystem (read/write/edit), grep, glob, and bash execution.
- 🧩 **Shared Architecture**: Unified Zod schemas and TypeScript types shared across CLI, Server, and Database.

---

## 🏗️ Project Structure

CodeFlow is organized as a monorepo using Bun Workspaces:

```txt
packages/
├── cli/        # React-based Terminal UI client
├── server/     # Hono API & AI orchestration (OpenAI/Anthropic)
├── database/   # Prisma schema & generated clients
└── shared/     # Unified Zod schemas, types, and model definitions
```

---

## 📊 Schemas & Data Model

### 🗄️ Database Schema (Prisma)

The persistent layer is managed by Prisma and PostgreSQL. The primary model is the **Session**:

| Field       | Type            | Description                                          |
| :---------- | :-------------- | :--------------------------------------------------- |
| `id`        | `String (CUID)` | Unique identifier for the session                    |
| `title`     | `String`        | Human-readable title for the session                 |
| `messages`  | `Json`          | Array of message objects (Role, Content, Tool Calls) |
| `createdAt` | `DateTime`      | Timestamp of creation                                |
| `updatedAt` | `DateTime`      | Last modification timestamp                          |

### 🔍 Validation Schemas (Zod)

Located in `packages/shared/src/schemas.ts`, these define the contract between the Assistant and the CLI tools:

- **ModeType**: `PLAN` | `BUILD`
- **Tool Contracts**:
  - `readFile`: `{ path: string }`
  - `writeFile`: `{ path: string, content: string }`
  - `editFile`: `{ path: string, oldString: string, newString: string }`
  - `bash`: `{ command: string, timeout?: number }`
  - `listDirectory`, `glob`, `grep`.

---

- **[Bun](https://bun.sh/)** (Latest)

### ⚙️ Quick Start (Global Installation)

1. **Install globally**:

   ```bash
   git clone https://github.com/ashutoshg-2005/CodeFlow.git
   cd CodeFlow
   bun install
   bun run link:cli
   ```

2. **Configure Environment**:
   Ensure the following environment variables are set (e.g., in your `.bashrc`, `.zshrc`, or a local `.env` file):

   ```bash
   export API_URL=https://codeflowserver-production.up.railway.app
   export CLERK_FRONTEND_API=https://your-clerk-frontend-api
   export CLERK_OAUTH_CLIENT_ID=your-clerk-client-id
   ```

3. **Run it**:
   Simply type `codeflow` in any directory.

---

## 🛠️ Development & Running Locally

If you want to contribute or run your own instance:

### 📡 Backend Setup

1. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your credentials.
2. **Database Setup**:
   ```bash
   bun run --cwd packages/database db:generate
   bunx prisma db push --schema packages/database/prisma/schema.prisma
   ```
3. **Run Server**:
   ```bash
   bun run dev:server
   ```

### 💻 CLI Development

To point the CLI to a local server:

```bash
export API_URL=http://localhost:3000
bun run dev:cli
```

## 🧠 Modes of Operation

### 🗺️ PLAN Mode

Best for brainstorming and architecture.

- **Read-only**: Assistant can see your code but cannot modify it.
- **Tools**: `readFile`, `listDirectory`, `glob`, `grep`.

### ⚒️ BUILD Mode

Best for implementation.

- **Write Access**: Assistant can create/edit files and run commands.
- **Tools**: All PLAN tools + `writeFile`, `editFile`, `bash`.

---

## 🛠️ Tech Stack

- **Runtime**: Bun
- **Frontend**: React, OpenTUI, React Router
- **Backend**: Hono, Zod, AI SDK
- **Database**: Prisma, PostgreSQL
- **Auth & Payments**: Clerk, Polar.sh

---

## 📜 License

[MIT](LICENSE)

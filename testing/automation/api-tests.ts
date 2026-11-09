// Postman / Newman harness for the CodeFlow API.
// Starts the REAL Hono server (packages/server/src/index.ts) on a local port with Clerk, Polar, PostgreSQL
// and the model API replaced by stubs, so no outside service is called. The bearer token picks the stub user:
//   user-ok (100 credits)  user-zero (0)  user-neg (-1)  user-one (1)  user-down (credits look-up fails)
//   anything else = invalid token. Session "s1" exists; every other id is "not found".
//
//   bun testing/automation/api-tests.ts           start the stub server, run both collections with Newman, stop
//   bun testing/automation/api-tests.ts --serve   only keep the stub server running (use it from the Postman app)
import { mock } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dir;
const serverSrc = join(here, "../../packages/server/src");
const port = Number(process.env.API_TEST_PORT ?? 3101);

const USERS: Record<string, { id: string; balance: number | "down" }> = {
  "user-ok": { id: "user_ok", balance: 100 },
  "user-zero": { id: "user_zero", balance: 0 },
  "user-neg": { id: "user_neg", balance: -1 },
  "user-one": { id: "user_one", balance: 1 },
  "user-down": { id: "user_down", balance: "down" },
};
const session = (userId: string) => ({ id: "s1", userId, title: "demo session", messages: [], createdAt: new Date("2026-01-01") });

const aiPath = Bun.resolveSync("ai", serverSrc);
const dbClientPath = Bun.resolveSync("@codeflow/database/client", serverSrc);
const realAi = await import(aiPath);

mock.module(join(serverSrc, "lib/auth"), () => ({
  authenticateOAuthRequest: async (req: Request) => {
    const user = USERS[(req.headers.get("authorization") ?? "").replace(/^Bearer /, "")];
    return user ? { userId: user.id } : null;
  },
}));
mock.module(join(serverSrc, "lib/polar"), () => ({
  getAvailableCreditsBalance: async (userId: string) => {
    const user = Object.values(USERS).find((u) => u.id === userId);
    if (!user || user.balance === "down") throw new Error("Polar unreachable");
    return user.balance;
  },
  ingestAiUsage: async () => {},
  createCheckoutUrl: async () => "https://example.invalid/checkout",
  createCustomerPortalUrl: async () => "https://example.invalid/portal",
}));
mock.module(dbClientPath, () => ({
  db: {
    session: {
      findUnique: async ({ where }: any) => (where.id === "s1" ? session(where.userId) : null),
      findMany: async ({ where }: any) => [session(where.userId)],
      create: async ({ data }: any) => ({ id: "new1", messages: [], createdAt: new Date(), updatedAt: new Date(), ...data }),
      update: async ({ where }: any) => session(where.userId),
    },
  },
}));
mock.module(aiPath, () => ({
  ...realAi,
  streamText: () => ({
    toUIMessageStreamResponse: () =>
      new Response('data: {"type":"finish"}\n\n', { headers: { "content-type": "text/event-stream" } }),
  }),
}));

const { default: app } = await import(join(serverSrc, "index"));
const server = Bun.serve({ port, fetch: app.fetch, idleTimeout: app.idleTimeout });
console.log(`CodeFlow API (stubbed) listening on http://localhost:${port}`);

if (process.argv.includes("--serve")) {
  console.log("Serving for the Postman app. Press Ctrl+C to stop.");
} else {
  const results = join(here, "results");
  mkdirSync(results, { recursive: true });
  const runs: [string, string[], string][] = [
    ["codeflow-api.postman_collection.json", [], "newman-api.xml"],
    ["codeflow-chat-gate-data-driven.postman_collection.json", ["-d", join(here, "data/chat-gate.csv")], "newman-chat-gate.xml"],
  ];
  let failed = 0;
  for (const [collection, extra, xml] of runs) {
    const proc = Bun.spawn(
      ["bunx", "newman@6", "run", join(here, collection), "-e", join(here, "local.postman_environment.json"),
        "--env-var", `baseUrl=http://localhost:${port}`, ...extra, "-r", "cli,junit", "--reporter-junit-export", join(results, xml)],
      { stdio: ["inherit", "inherit", "inherit"] },
    );
    if ((await proc.exited) !== 0) failed++;
  }
  server.stop(true);
  console.log(failed ? `\n${failed} Newman run(s) FAILED` : "\nAll Newman runs passed");
  process.exit(failed ? 1 : 0);
}

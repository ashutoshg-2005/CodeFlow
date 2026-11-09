// Top-down integration: the real Hono server (packages/server/src/index.ts) with its real
// middleware chain (requireAuth -> requireCreditsBalance -> body validator -> route).
// External systems are replaced by STUBS, so no Clerk, Polar, Postgres or model API is called:
//   Clerk auth  -> lib/auth.authenticateOAuthRequest
//   Polar       -> lib/polar.getAvailableCreditsBalance / ingestAiUsage
//   Postgres    -> @codeflow/database/client db.session
//   Model API   -> ai.streamText
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { join } from "node:path";

// Resolve bare packages the same way the server does (they live in the server workspace).
const serverSrc = join(import.meta.dir, "../../packages/server/src");
const aiPath = Bun.resolveSync("ai", serverSrc);
const dbClientPath = Bun.resolveSync("@codeflow/database/client", serverSrc);
const realAi = await import(aiPath);

const stub = {
  balance: 100 as number | Error,
  session: { id: "s1", userId: "user_1", messages: [] } as object | null,
};

mock.module("../../packages/server/src/lib/auth", () => ({
  authenticateOAuthRequest: async (req: Request) =>
    req.headers.get("authorization") === "Bearer valid-token" ? { userId: "user_1" } : null,
}));

mock.module("../../packages/server/src/lib/polar", () => ({
  getAvailableCreditsBalance: async () => {
    if (stub.balance instanceof Error) throw stub.balance;
    return stub.balance;
  },
  ingestAiUsage: async () => {},
  createCheckoutUrl: async () => "https://example.invalid/checkout",
  createCustomerPortalUrl: async () => "https://example.invalid/portal",
}));

mock.module(dbClientPath, () => ({
  db: {
    session: {
      findUnique: async () => stub.session,
      update: async () => stub.session,
      findMany: async () => [],
      create: async () => stub.session,
    },
  },
}));

mock.module(aiPath, () => ({
  ...realAi,
  streamText: () => ({
    toUIMessageStreamResponse: () =>
      new Response("data: {\"type\":\"finish\"}\n\n", { headers: { "content-type": "text/event-stream" } }),
  }),
}));

const { default: server } = await import("../../packages/server/src/index");

const validBody = {
  id: "s1",
  mode: "BUILD",
  model: "claude-haiku-4-5",
  messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "hello" }] }],
};

function postChat(body: unknown, token: string | null = "valid-token") {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return server.fetch(new Request("http://localhost/chat", { method: "POST", headers, body: JSON.stringify(body) }));
}

beforeEach(() => {
  stub.balance = 100;
  stub.session = { id: "s1", userId: "user_1", messages: [] };
});

describe("Decision table: POST /chat gate", () => {
  test("DT-01 R1 no/invalid token (C1=F) -> 401 Unauthorized", async () => {
    const res = await postChat(validBody, "forged-token");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized. Run /login to continue." });
  });
  test("DT-02 R2 token ok, billing service down (C2=F) -> 503", async () => {
    stub.balance = new Error("Polar unreachable");
    const res = await postChat(validBody);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Unable to verify credits balance right now." });
  });
  test("DT-03 R3 balance not positive (C3=F) -> 402 Payment Required", async () => {
    stub.balance = 0;
    const res = await postChat(validBody);
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "No credits remaining. Run /upgrade to buy more credits." });
  });
  test("DT-04 R4 invalid body, mode 'DEBUG' (C4=F) -> 400", async () => {
    const res = await postChat({ ...validBody, mode: "DEBUG" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
  });
  test("DT-05 R5 session missing or not owned (C5=F) -> 404", async () => {
    stub.session = null;
    const res = await postChat(validBody);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Session not found" });
  });
  test("DT-06 R6 all causes true -> 200 event stream", async () => {
    const res = await postChat(validBody);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });
});

describe("BVA: credit gate 'balance <= 0 -> 402'", () => {
  test("BVA-24 balance = -1 -> 402", async () => {
    stub.balance = -1;
    expect((await postChat(validBody)).status).toBe(402);
  });
  test("BVA-25 balance = 0 -> 402", async () => {
    stub.balance = 0;
    expect((await postChat(validBody)).status).toBe(402);
  });
  test("BVA-26 balance = 1 -> allowed (200)", async () => {
    stub.balance = 1;
    expect((await postChat(validBody)).status).toBe(200);
  });
});

describe("ECP: request body classes", () => {
  test("ECP-17 unsupported model 'gpt-4' -> 400", async () => {
    expect((await postChat({ ...validBody, model: "gpt-4" })).status).toBe(400);
  });
  test("ECP-18 empty messages array -> 400", async () => {
    expect((await postChat({ ...validBody, messages: [] })).status).toBe(400);
  });
  test("ECP-19 PLAN mode with a valid body -> 200", async () => {
    expect((await postChat({ ...validBody, mode: "PLAN" })).status).toBe(200);
  });
});

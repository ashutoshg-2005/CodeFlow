// Unit tests for packages/shared/src/schemas.ts and packages/server/src/lib/models.ts.
// resolveChatModel only builds a provider client object; no API key or network call is used.
import { describe, expect, test } from "bun:test";
import { getToolContracts, modeSchema, Mode } from "../../packages/shared/src/schemas";
import { isSupportedChatModel, resolveChatModel } from "../../packages/server/src/lib/models";

describe("ECP: mode values", () => {
  test("ECP-08 'PLAN' is accepted", () => expect(modeSchema.safeParse("PLAN").success).toBe(true));
  test("ECP-09 'BUILD' is accepted", () => expect(modeSchema.safeParse("BUILD").success).toBe(true));
  test("ECP-10 'DEBUG' (unknown mode) is rejected", () => expect(modeSchema.safeParse("DEBUG").success).toBe(false));
  test("ECP-11 'plan' (wrong case) is rejected", () => expect(modeSchema.safeParse("plan").success).toBe(false));
});

describe("Unit: tool contracts per mode", () => {
  test("UT-01 PLAN mode exposes only the 4 read-only tools", () => {
    expect(Object.keys(getToolContracts(Mode.PLAN)).sort()).toEqual(["glob", "grep", "listDirectory", "readFile"]);
  });
  test("UT-02 BUILD mode exposes all 7 tools", () => {
    expect(Object.keys(getToolContracts(Mode.BUILD)).sort()).toEqual(
      ["bash", "editFile", "glob", "grep", "listDirectory", "readFile", "writeFile"],
    );
  });
});

describe("Unit: model registry", () => {
  test("UT-03 isSupportedChatModel('gpt-5.4-mini') is true", () => expect(isSupportedChatModel("gpt-5.4-mini")).toBe(true));
  test("UT-04 isSupportedChatModel('gpt-4') is false", () => expect(isSupportedChatModel("gpt-4")).toBe(false));
  test("UT-05 resolveChatModel('claude-haiku-4-5') resolves to the anthropic provider", () => {
    const resolved = resolveChatModel("claude-haiku-4-5");
    expect(resolved.provider).toBe("anthropic");
    expect(resolved.modelId).toBe("claude-haiku-4-5");
  });
  test("UT-06 resolveChatModel('unknown-model') throws", () => {
    expect(() => resolveChatModel("unknown-model")).toThrow("Unsupported model: unknown-model");
  });
});

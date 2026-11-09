// Unit tests for packages/server/src/lib/credits.ts (pure logic, no network).
// Model under test: claude-haiku-4-5 = $1 / M input tokens, $5 / M output tokens,
// so the exact expected charge is ceil((input + 5 * output) / 10000) credits.
import { describe, expect, test } from "bun:test";
import { calculateCreditsForUsage } from "../../packages/server/src/lib/credits";

const haiku = (inputTokens: unknown, outputTokens: unknown) =>
  calculateCreditsForUsage({
    provider: "anthropic",
    model: "claude-haiku-4-5",
    usage: { inputTokens, outputTokens } as any,
  }).credits;

describe("BVA: input domain 4n+1", () => {
  const cases: [string, number, number, number][] = [
    ["BVA-01", 0, 100000, 50],
    ["BVA-02", 1, 100000, 51],
    ["BVA-03", 100000, 100000, 60],
    ["BVA-04", 199999, 100000, 70],
    ["BVA-05", 200000, 100000, 70],
    ["BVA-06", 100000, 0, 10],
    ["BVA-07", 100000, 1, 11],
    ["BVA-08", 100000, 199999, 110],
    ["BVA-09", 100000, 200000, 110],
  ];
  for (const [id, x, y, expected] of cases) {
    test(`${id} input=${x} output=${y} -> ${expected} credits`, () => {
      expect(haiku(x, y)).toBe(expected);
    });
  }

  test("BVA-10 robust: input=-1 is rejected", () => {
    expect(() => haiku(-1, 100000)).toThrow("Credit conversion requires input and output token counts");
  });
  test("BVA-11 robust: output=-1 is rejected", () => {
    expect(() => haiku(100000, -1)).toThrow("Credit conversion requires input and output token counts");
  });
});

describe("BVA: output domain", () => {
  const cases: [string, number, number][] = [
    ["BVA-12", 0, 0],
    ["BVA-13", 1, 1],
    ["BVA-14", 9999, 1],
    ["BVA-15", 10000, 1],
    ["BVA-16", 10001, 2],
    ["BVA-17", 70000, 7],
  ];
  for (const [id, input, expected] of cases) {
    test(`${id} input=${input} output=0 -> ${expected} credits`, () => {
      expect(haiku(input, 0)).toBe(expected);
    });
  }
});

describe("ECP: provider / model classes", () => {
  const bill = (provider: string, model: string) =>
    calculateCreditsForUsage({ provider, model, usage: { inputTokens: 10, outputTokens: 10 } as any });

  test("ECP-01 valid model + matching provider -> credits returned", () => {
    expect(bill("anthropic", "claude-haiku-4-5").credits).toBe(1);
  });
  test("ECP-02 valid model + wrong provider -> unsupported model", () => {
    expect(() => bill("anthropic", "gpt-5.4")).toThrow("Unsupported billing model: gpt-5.4");
  });
  test("ECP-03 unknown provider -> unsupported provider", () => {
    expect(() => bill("google", "gemini-pro")).toThrow("Unsupported billing provider: google");
  });
  test("ECP-04 known provider + unknown model -> unsupported model", () => {
    expect(() => bill("openai", "gpt-4")).toThrow("Unsupported billing model: gpt-4");
  });
});

describe("ECP: token count classes", () => {
  test("ECP-05 non-integer tokens (1.5) are rejected", () => {
    expect(() => haiku(1.5, 10)).toThrow();
  });
  test("ECP-06 missing tokens (undefined) are rejected", () => {
    expect(() => haiku(undefined, 10)).toThrow();
  });
  test("ECP-07 non-finite tokens (Infinity) are rejected", () => {
    expect(() => haiku(Infinity, 10)).toThrow();
  });
});

describe("White box: MC/DC for the 8-condition guard in getTokenCounts", () => {
  // Each row makes exactly one atomic condition true (short-circuit OR), plus the all-false row.
  const rows: [string, string, unknown, unknown, boolean][] = [
    ["WB-01", "all conditions false (valid)", 10, 10, false],
    ["WB-02", "C1 inputTokens == null", undefined, 10, true],
    ["WB-03", "C2 outputTokens == null", 10, undefined, true],
    ["WB-04", "C3 !isFinite(inputTokens)", Infinity, 10, true],
    ["WB-05", "C4 !isFinite(outputTokens)", 10, Infinity, true],
    ["WB-06", "C5 !isInteger(inputTokens)", 1.5, 10, true],
    ["WB-07", "C6 !isInteger(outputTokens)", 10, 1.5, true],
    ["WB-08", "C7 inputTokens < 0", -1, 10, true],
    ["WB-09", "C8 outputTokens < 0", 10, -1, true],
  ];
  for (const [id, label, x, y, throws] of rows) {
    test(`${id} ${label} -> ${throws ? "throws" : "returns credits"}`, () => {
      if (throws) expect(() => haiku(x, y)).toThrow();
      else expect(haiku(x, y)).toBe(1);
    });
  }
});

describe("White box: basis paths of getModelPricing (V(G) = 3)", () => {
  const bill = (provider: string, model: string) =>
    calculateCreditsForUsage({ provider, model, usage: { inputTokens: 1, outputTokens: 1 } as any });

  test("WB-10 path 1-2-5: model found, provider matches -> pricing returned", () => {
    expect(bill("openai", "gpt-5.4-nano").credits).toBe(1);
  });
  test("WB-11 path 1-2-3-4: provider known, model mismatch -> 'Unsupported billing model'", () => {
    expect(() => bill("openai", "claude-opus-4-6")).toThrow("Unsupported billing model");
  });
  test("WB-12 path 1-2-3-6: provider unknown -> 'Unsupported billing provider'", () => {
    expect(() => bill("mistral", "claude-opus-4-6")).toThrow("Unsupported billing provider");
  });
});

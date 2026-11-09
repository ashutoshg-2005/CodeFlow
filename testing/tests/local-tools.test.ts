// Bottom-up integration: the real executeLocalTool (packages/cli/src/lib/local-tools.ts)
// against a real file system. This test file is the DRIVER. Everything happens inside a
// throw-away temp directory, so the CodeFlow project itself is never read or written.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeLocalTool } from "../../packages/cli/src/lib/local-tools";

const originalCwd = process.cwd();
let root: string;
let project: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "codeflow-test-"));
  project = join(root, "project");
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(join(root, "outside.txt"), "secret");
  writeFileSync(join(project, "src", "a.txt"), "hello");
  writeFileSync(join(project, "..notes.md"), "notes inside the project");
  writeFileSync(join(project, "f9999.txt"), "x".repeat(9999));
  writeFileSync(join(project, "f10000.txt"), "x".repeat(10000));
  writeFileSync(join(project, "f10001.txt"), "x".repeat(10001));
  process.chdir(project);
});

afterAll(() => {
  process.chdir(originalCwd);
  rmSync(root, { recursive: true, force: true });
});

describe("BVA: readFile truncation at MAX_FILE_SIZE = 10,000 chars", () => {
  test("BVA-18 9,999 chars -> returned whole, not truncated", async () => {
    const r: any = await executeLocalTool("readFile", { path: "f9999.txt" }, "PLAN");
    expect(r.content).toHaveLength(9999);
    expect(r.truncated).toBeUndefined();
  });
  test("BVA-19 10,000 chars -> returned whole, not truncated", async () => {
    const r: any = await executeLocalTool("readFile", { path: "f10000.txt" }, "PLAN");
    expect(r.content).toHaveLength(10000);
    expect(r.truncated).toBeUndefined();
  });
  test("BVA-20 10,001 chars -> truncated to 10,000, totalLength 10,001", async () => {
    const r: any = await executeLocalTool("readFile", { path: "f10001.txt" }, "PLAN");
    expect(r).toMatchObject({ truncated: true, totalLength: 10001 });
    expect(r.content).toHaveLength(10000);
  });
});

describe("ECP + MC/DC: path sandbox", () => {
  test("ECP-12 path inside project 'src/a.txt' (A=F, B=F) -> file is read", async () => {
    expect(await executeLocalTool("readFile", { path: "src/a.txt" }, "PLAN")).toEqual({ content: "hello" });
  });
  test("ECP-13 parent escape '../outside.txt' (A=T) -> rejected", async () => {
    await expect(executeLocalTool("readFile", { path: "../outside.txt" }, "PLAN")).rejects.toThrow("Path is outside the project directory");
  });
  test("ECP-14 path on another drive 'Z:/secret.txt' (A=F, B=T) -> rejected", async () => {
    await expect(executeLocalTool("readFile", { path: "Z:/secret.txt" }, "PLAN")).rejects.toThrow("Path is outside the project directory");
  });
  test("ECP-15 file inside project whose name starts with '..' ('..notes.md') -> file is read", async () => {
    expect(await executeLocalTool("readFile", { path: "..notes.md" }, "PLAN")).toEqual({ content: "notes inside the project" });
  });
});

describe("Decision table: mode x tool class in executeLocalTool", () => {
  test("DT-07 PLAN + read-only tool (listDirectory) -> allowed", async () => {
    const r: any = await executeLocalTool("listDirectory", { path: "src" }, "PLAN");
    expect(r.entries).toEqual([{ name: "a.txt", type: "file" }]);
  });
  test("DT-08 PLAN + write tool (writeFile) -> rejected, nothing written", async () => {
    await expect(executeLocalTool("writeFile", { path: "plan.txt", content: "x" }, "PLAN")).rejects.toThrow("Tool writeFile is not available in PLAN mode");
    expect(() => readFileSync(join(project, "plan.txt"))).toThrow();
  });
  test("DT-09 PLAN + unknown tool -> rejected by the PLAN guard", async () => {
    await expect(executeLocalTool("deleteFile", {}, "PLAN")).rejects.toThrow("Tool deleteFile is not available in PLAN mode");
  });
  test("DT-10 BUILD + read-only tool (readFile) -> allowed", async () => {
    expect(await executeLocalTool("readFile", { path: "src/a.txt" }, "BUILD")).toEqual({ content: "hello" });
  });
  test("DT-11 BUILD + write tool (writeFile) -> file written", async () => {
    const r: any = await executeLocalTool("writeFile", { path: "out/b.txt", content: "built" }, "BUILD");
    expect(r).toMatchObject({ success: true, bytesWritten: 5 });
    expect(readFileSync(join(project, "out", "b.txt"), "utf-8")).toBe("built");
  });
  test("DT-12 BUILD + unknown tool -> 'Unknown tool'", async () => {
    await expect(executeLocalTool("deleteFile", {}, "BUILD")).rejects.toThrow("Unknown tool: deleteFile");
  });
});

describe("White box: editFile paths", () => {
  test("WB-13 occurrences = 0 -> 'oldString not found in file'", async () => {
    writeFileSync(join(project, "e.txt"), "alpha beta");
    await expect(executeLocalTool("editFile", { path: "e.txt", oldString: "gamma", newString: "x" }, "BUILD")).rejects.toThrow("oldString not found in file");
  });
  test("WB-14 occurrences = 2 -> 'ambiguous; found 2 matches', file unchanged", async () => {
    writeFileSync(join(project, "e.txt"), "beta beta");
    await expect(executeLocalTool("editFile", { path: "e.txt", oldString: "beta", newString: "x" }, "BUILD")).rejects.toThrow("oldString is ambiguous; found 2 matches");
    expect(readFileSync(join(project, "e.txt"), "utf-8")).toBe("beta beta");
  });
  test("WB-15 occurrences = 1 -> text replaced", async () => {
    writeFileSync(join(project, "e.txt"), "alpha beta");
    await executeLocalTool("editFile", { path: "e.txt", oldString: "beta", newString: "gamma" }, "BUILD");
    expect(readFileSync(join(project, "e.txt"), "utf-8")).toBe("alpha gamma");
  });
  test("WB-16 newString containing '$$' (shell PID) is written literally", async () => {
    writeFileSync(join(project, "run.sh"), "echo PID");
    await executeLocalTool("editFile", { path: "run.sh", oldString: "PID", newString: "$$" }, "BUILD");
    expect(readFileSync(join(project, "run.sh"), "utf-8")).toBe("echo $$");
  });
});

// On Windows, grep is not on the PATH of a plain PowerShell window, and Bun does not see a PATH
// change made while it runs. Git for Windows ships a grep.exe, so when grep is missing and Git's
// copy exists, the tool's `Bun.spawn(["grep", ...])` call is pointed at that file for this test run.
const gitGrep = "C:\\Program Files\\Git\\usr\\bin\\grep.exe";
const useGitGrep = Bun.which("grep") == null && process.platform === "win32" && existsSync(gitGrep);
if (useGitGrep) {
  const realSpawn = Bun.spawn.bind(Bun) as (...args: any[]) => unknown;
  (Bun as any).spawn = (cmd: unknown, ...rest: unknown[]) =>
    realSpawn(Array.isArray(cmd) && cmd[0] === "grep" ? [gitGrep, ...cmd.slice(1)] : cmd, ...rest);
}
const hasGrep = Bun.which("grep") != null || useGitGrep;

describe.skipIf(!hasGrep)("BVA + ECP: grep cap (needs grep)", () => {
  const grepIn = async (lines: number) => {
    mkdirSync(join(project, "g"), { recursive: true });
    writeFileSync(join(project, "g", "g.txt"), Array.from({ length: lines }, (_, i) => `needle ${i}`).join("\n"));
    return (await executeLocalTool("grep", { pattern: "needle", path: "g" }, "PLAN")) as any;
  };
  test("BVA-21 49 matches -> 49 returned, not truncated", async () => {
    const r = await grepIn(49);
    expect(r.matches).toHaveLength(49);
    expect(r.truncated).toBeUndefined();
  });
  test("BVA-22 50 matches -> 50 returned, not truncated", async () => {
    const r = await grepIn(50);
    expect(r.matches).toHaveLength(50);
    expect(r.truncated).toBeUndefined();
  });
  test("BVA-23 51 matches -> 50 returned, truncated, totalMatches 51", async () => {
    const r = await grepIn(51);
    expect(r.matches).toHaveLength(50);
    expect(r).toMatchObject({ truncated: true, totalMatches: 51 });
  });
  test("ECP-16 pattern that starts with '-' ('-v') is searched as text", async () => {
    mkdirSync(join(project, "flags"), { recursive: true });
    writeFileSync(join(project, "flags", "usage.txt"), "pass -v for verbose\nplain line");
    const r = (await executeLocalTool("grep", { pattern: "-v", path: "flags" }, "PLAN")) as any;
    expect(r.matches?.map((m: any) => m.content)).toEqual(["pass -v for verbose"]);
  });
});

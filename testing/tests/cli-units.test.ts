// Unit tests for CLI helpers. Importing the command list does not open a browser,
// read credentials, or call the server; actions only run when a command is chosen.
import { describe, expect, test } from "bun:test";
import { getfilteredCommands } from "../../packages/cli/src/components/command-menu/filter-commands";
import { getErrorMessage } from "../../packages/cli/src/lib/http-errors";

const names = (query: string) => getfilteredCommands(query).map((c) => c.name);

describe("Unit: command menu filter (ECP on the typed query)", () => {
  test("UT-07 empty query returns all 10 commands", () => expect(names("")).toHaveLength(10));
  test("UT-08 prefix 'mo' returns only 'models'", () => expect(names("mo")).toEqual(["models"]));
  test("UT-09 upper-case 'MO' is matched case-insensitively", () => expect(names("MO")).toEqual(["models"]));
  test("UT-10 prefix 'l' returns 'login' and 'logout'", () => expect(names("l")).toEqual(["login", "logout"]));
  test("UT-11 prefix 'zz' returns no commands", () => expect(names("zz")).toEqual([]));
});

describe("Unit: HTTP error message extraction", () => {
  const response = (json: () => Promise<unknown>, status: number, statusText: string) => ({ json, status, statusText });

  test("UT-12 JSON body with an error string -> that message", async () => {
    expect(await getErrorMessage(response(async () => ({ error: "No credits remaining" }), 402, "Payment Required")))
      .toBe("No credits remaining");
  });
  test("UT-13 body that is not JSON -> status text", async () => {
    expect(await getErrorMessage(response(async () => { throw new SyntaxError("bad json"); }, 503, "Service Unavailable")))
      .toBe("Service Unavailable");
  });
  test("UT-14 empty error and empty status text -> generic message with status code", async () => {
    expect(await getErrorMessage(response(async () => ({ error: "" }), 500, ""))).toBe("Request failed with status 500");
  });
});

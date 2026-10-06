import { assertEquals } from "@std/assert";
import {
  apiHostFromConnection,
  compact,
  formatProjectsError,
  listResult,
  parseError,
  ProjectsClient,
} from "../../lib/client.ts";
import { mockCtx, mockProjectsCtx } from "../_helpers.ts";

Deno.test("client: host comes from the connection, defaulting to the US host", () => {
  assertEquals(apiHostFromConnection(undefined), "projects.zoho.com");
  assertEquals(
    new ProjectsClient(mockProjectsCtx([], "projects.zoho.in").ctx).host,
    "projects.zoho.in",
  );
  assertEquals(new ProjectsClient(mockCtx([]).ctx).host, "projects.zoho.com");
});

Deno.test("client: compact drops unset keys but keeps false and 0", () => {
  assertEquals(compact({ a: "x", b: undefined, c: "", d: false, e: 0, f: null }), {
    a: "x",
    d: false,
    e: 0,
  });
});

Deno.test("client: listResult handles envelope, bare array, array page_info and fallback key", () => {
  const r = listResult(
    { page_info: { page: 2, per_page: 5, has_next_page: true }, tasks: [1, 2] },
    "tasks",
  );
  assertEquals([r.items, r.hasNext, r.page], [[1, 2], true, 2]);
  assertEquals(listResult([1], "x"), { items: [1], hasNext: false, page: 1 });
  assertEquals(
    listResult({ page_info: [{ page: 1, has_next_page: "true" }], milestones: [9] }, "phases"),
    { items: [9], hasNext: true, page: 1 },
  );
  assertEquals(listResult({}, "x"), { items: [], hasNext: false, page: 1 });
  assertEquals(listResult(null, "x").items, []);
});

Deno.test("client: errors are parsed from the body, tolerating non-JSON", () => {
  const body = JSON.stringify({
    error: {
      status_code: "401",
      title: "INVALID_OAUTHTOKEN",
      details: [{ message: "Invalid OAuth access token." }],
    },
  });
  assertEquals(parseError(body), {
    title: "INVALID_OAUTHTOKEN",
    errorType: undefined,
    message: "Invalid OAuth access token.",
  });
  assertEquals(parseError("<html>"), undefined);
  assertEquals(parseError('{"x":1}'), undefined);
  assertEquals(
    formatProjectsError(401, "GET", "/x", body),
    "Zoho Projects 401 for GET /x: INVALID_OAUTHTOKEN — Invalid OAuth access token.",
  );
  const long = formatProjectsError(500, "GET", "/x", "z".repeat(700));
  assertEquals(long.includes("700 bytes"), true);
});

Deno.test("client: request builds the versioned URL, sends JSON and never sets authorization", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: {} }, { body: {} }]);
  const client = new ProjectsClient(ctx);
  await client.request("POST", "/portal/1/x", {
    query: { per_page: 5, skip: undefined },
    body: { a: 1 },
    version: "v3.1",
  });
  assertEquals(calls[0].url, "https://projects.zoho.com/api/v3.1/portal/1/x?per_page=5");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  await client.get("/portals");
  assertEquals(calls[1].url, "https://projects.zoho.com/api/v3/portals");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: an empty 2xx body is {}, an error status throws the vendor code, non-JSON 200 throws", async () => {
  const { ctx } = mockProjectsCtx([
    { status: 204 },
    { status: 404, body: { error: { title: "RESOURCE_NOT_FOUND" } } },
    { body: "<html>shell</html>" },
  ]);
  const client = new ProjectsClient(ctx);
  assertEquals(await client.request("DELETE", "/x"), {});
  const fail = async () => {
    try {
      await client.get("/y");
    } catch (e) {
      return (e as Error).message;
    }
    return "";
  };
  assertEquals((await fail()).includes("RESOURCE_NOT_FOUND"), true);
  assertEquals((await fail()).includes("non-JSON"), true);
});

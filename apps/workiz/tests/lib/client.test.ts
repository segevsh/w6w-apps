import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  compact,
  encodeId,
  formatWorkizError,
  isForbiddenBody,
  truncate,
  unwrapList,
  unwrapRecord,
  WorkizClient,
} from "../../lib/client.ts";
import { bodyOf, forbiddenBody, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("client: one host, one prefix, and the token is not part of either", () => {
  assertEquals(API_BASE, "https://api.workiz.com");
  assertEquals(API_PREFIX, "/api/v1");
});

Deno.test("client: compact drops only unset values, keeping false and 0", () => {
  assertEquals(
    compact({ a: 1, b: false, c: 0, d: undefined, e: null, f: "" }),
    { a: 1, b: false, c: 0 },
  );
});

Deno.test("client: compact renames camelCase form keys to Workiz's wire names", () => {
  assertEquals(
    compact({ authSecret: "sec_1", uuid: "abc" }, { authSecret: "auth_secret", uuid: "UUID" }),
    { auth_secret: "sec_1", UUID: "abc" },
  );
});

Deno.test("client: encodeId escapes a path segment", () => {
  assertEquals(encodeId("abc-123"), "abc-123");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
  assertEquals(encodeId("  spaced  "), "spaced");
});

Deno.test("client: truncate keeps short text and caps long text", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 600);
  assert(out.startsWith("x".repeat(600)), "kept prefix");
  assert(out.includes("700 bytes truncated"), out.slice(-40));
});

Deno.test("client: the Forbidden shape is matched on fields, not on status", () => {
  assert(isForbiddenBody(forbiddenBody()));
  assert(isForbiddenBody({ success: false, error: "Forbidden" }));
  assertEquals(isForbiddenBody({ success: true, error: "Forbidden" }), false);
  assertEquals(isForbiddenBody({ success: false, error: "Other" }), false);
  assertEquals(isForbiddenBody([{ success: false, error: "Forbidden" }]), false);
  assertEquals(isForbiddenBody(null), false);
});

Deno.test("client: formatWorkizError surfaces the vendor message, token-free", () => {
  assertEquals(
    formatWorkizError(403, "GET", "/team/all/", forbiddenBody()),
    "Workiz refused GET /team/all/ (403 Forbidden): Invalid API path or malformed API key.",
  );
  assertEquals(
    formatWorkizError(500, "POST", "/lead/create/", undefined, "upstream exploded"),
    "Workiz 500 for POST /lead/create/: upstream exploded",
  );
  assertEquals(
    formatWorkizError(400, "GET", "/lead/all/", { message: "bad start_date" }),
    "Workiz 400 for GET /lead/all/: bad start_date",
  );
});

/** `/job/get/` and `/job/all/` nest each record one level deeper — collapse that. */
Deno.test("client: unwrapRecord collapses {flag, data} and passes bare records through", () => {
  assertEquals(unwrapRecord({ flag: true, data: { UUID: "j1" } }), { UUID: "j1" });
  // A bare record has no `data`, so it survives untouched.
  assertEquals(unwrapRecord({ UUID: "l1" }), { UUID: "l1" });
  // A write envelope's `data` is an ARRAY; unwrapRecord must not flatten it.
  assertEquals(unwrapRecord({ flag: true, data: [{ UUID: "j1" }] }), {
    flag: true,
    data: [{ UUID: "j1" }],
  });
});

Deno.test("client: unwrapList reads all three shapes the API returns", () => {
  // Bare array of records (team/all, lead/all, TimeOff/get).
  assertEquals(unwrapList([{ UUID: "l1" }, { UUID: "l2" }]), [{ UUID: "l1" }, { UUID: "l2" }]);
  // Array of wrappers (job/get, and job/all's documented reading).
  assertEquals(unwrapList([{ flag: true, data: { UUID: "j1" } }]), [{ UUID: "j1" }]);
  // A single record read (team/get).
  assertEquals(unwrapList({ UUID: "t1" }), [{ UUID: "t1" }]);
  // An envelope around the array.
  assertEquals(unwrapList({ flag: true, data: [{ UUID: "j1" }] }), [{ UUID: "j1" }]);
  // Nothing at all is an empty list, never a crash.
  assertEquals(unwrapList(undefined), []);
  assertEquals(unwrapList(null), []);
});

Deno.test("client: json sends the token-free path, and the right accept header", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new WorkizClient(ctx).json("/team/all/");

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.workiz.com/team/all/");
  assertEquals(pathOf(calls[0].url), "/team/all/");
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("client: json builds a JSON body with a content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { flag: true, data: [] } }]);
  await new WorkizClient(ctx).json("/lead/create/", {
    method: "POST",
    body: { FirstName: "Dana" },
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { FirstName: "Dana" });
});

Deno.test("client: scalar query params are set once, arrays are repeated", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new WorkizClient(ctx).json("/lead/all/", {
    query: { start_date: "2026-09-01", offset: 0, records: 100, only_open: false },
  });
  assertEquals(queryOf(calls[0].url), {
    start_date: "2026-09-01",
    offset: "0",
    records: "100",
    only_open: "false",
  });

  const second = mockCtx([{ body: [] }]);
  await new WorkizClient(second.ctx).json("/lead/all/", { query: { status: ["Submited", "New"] } });
  assertEquals(queryAll(second.calls[0].url), { status: ["Submited", "New"] });
});

Deno.test("client: unset query params are omitted, false and 0 are not", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new WorkizClient(ctx).json("/job/all/", {
    query: { start_date: undefined, offset: 0, records: 10, only_open: false },
  });
  assertEquals(queryOf(calls[0].url), { offset: "0", records: "10", only_open: "false" });
});

Deno.test("client: a non-2xx response throws with the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: forbiddenBody() }]);
  await assertRejects(
    () => new WorkizClient(ctx).json("/team/all/"),
    Error,
    "Workiz refused GET /team/all/ (403 Forbidden): Invalid API path or malformed API key.",
  );
});

/** HTTP 200 is not proof of success: the Forbidden body at 200 is still a failure. */
Deno.test("client: a 200 carrying the Forbidden body throws", async () => {
  const { ctx } = mockCtx([{ status: 200, body: forbiddenBody() }]);
  await assertRejects(() => new WorkizClient(ctx).json("/team/all/"), Error, "Workiz refused");
});

Deno.test("client: an empty 204 body parses to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new WorkizClient(ctx).json("/lead/all/"), undefined);
});

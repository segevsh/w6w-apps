import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  compact,
  encodeId,
  extractGoCanvasError,
  formatGoCanvasError,
  GoCanvasClient,
  hardDeleteQuery,
  readPageInfo,
  requireOneOf,
  toIdList,
  toList,
} from "../../lib/client.ts";
import { errorsBody, loginErrorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null, empty string and empty arrays but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: [], e: false, f: 0, g: "x", h: [1] }),
    { e: false, f: 0, g: "x", h: [1] },
  );
});

Deno.test("encodeId: encodes a GUID-or-id segment and refuses an empty one", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(encodeId(42), "42");
  assertThrows(() => encodeId(""), Error, "id is required");
});

Deno.test("toList / toIdList: split commas, trim, reject non-numeric ids", () => {
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toIdList("1, 2", "x"), [1, 2]);
  assertThrows(() => toIdList("1,z", "siteIds"), Error, 'siteIds: "z" is not a numeric id');
});

Deno.test("asOptionalJson: parses strings, passes objects, names the bad field", () => {
  assertEquals(asOptionalJson<number[]>("[1]", "r"), [1]);
  assertEquals(asOptionalJson<number[]>([2], "r"), [2]);
  assertEquals(asOptionalJson("", "r"), undefined);
  assertThrows(() => asOptionalJson("{x", "responses"), Error, "responses is not valid JSON");
});

Deno.test("hardDeleteQuery: soft delete sends nothing, hard sends hard_delete=true", () => {
  assertEquals(hardDeleteQuery(false), {});
  assertEquals(hardDeleteQuery(undefined), {});
  assertEquals(hardDeleteQuery(true), { hard_delete: true });
});

Deno.test("requireOneOf: passes with one filter, throws naming them all otherwise", () => {
  requireOneOf({ formId: 1 }, ["formId", "userId"], "x");
  assertThrows(
    () => requireOneOf({ formId: "" }, ["formId", "userId"], "x"),
    Error,
    "formId, userId",
  );
});

Deno.test("extractGoCanvasError: reads the errors array, the singular error, and raw text", () => {
  assertEquals(extractGoCanvasError(JSON.stringify(errorsBody("a", "b"))), "a; b");
  assertEquals(
    extractGoCanvasError(JSON.stringify(loginErrorBody())),
    "You must be logged in to access this section of the site.",
  );
  assertEquals(extractGoCanvasError("<html>nope</html>"), "<html>nope</html>");
});

Deno.test("formatGoCanvasError: a 429 names RateLimit-Reset when present", () => {
  const withReset = formatGoCanvasError(
    429,
    "GET",
    "/api/v3/forms",
    "",
    new Headers({ "ratelimit-reset": "1480000000" }),
  );
  assert(withReset.includes("1480000000"), withReset);
  assert(formatGoCanvasError(429, "GET", "/x", "").includes("at least a minute"));
});

Deno.test("readPageInfo: hyphenated and underscored header spellings both work; last page has no next", () => {
  const hy = readPageInfo(
    new Headers({
      "current-page": "2",
      "total-pages": "3",
      "page-items": "100",
      "total-count": "250",
    }),
  );
  assertEquals(hy, { currentPage: 2, pageItems: 100, totalCount: 250, totalPages: 3, nextPage: 3 });
  const us = readPageInfo(new Headers({ current_page: "3", total_pages: "3" }));
  assertEquals(us.nextPage, null);
  assertEquals(readPageInfo(new Headers()).currentPage, null);
});

Deno.test("client.request: sends JSON accept header, no credential, and parses the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const out = await new GoCanvasClient(ctx).request("/me");
  assertEquals(out, { id: 1 });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(pathOf(calls[0].url), "/api/v3/me");
});

Deno.test("client.request: body is JSON with a content-type; unset query values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoCanvasClient(ctx).request("/x", {
    method: "POST",
    body: { a: 1 },
    query: { keep: 1, drop: undefined, empty: "" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].url, "https://www.gocanvas.com/api/v3/x?keep=1");
});

Deno.test("client.request: an error status throws the vendor message, either shape", async () => {
  const a = mockCtx([{ status: 422, body: errorsBody("Invalid department ID provided") }]);
  await assertRejects(
    () => new GoCanvasClient(a.ctx).request("/x"),
    Error,
    "GoCanvas 422 for GET /api/v3/x: Invalid department ID provided",
  );
  const b = mockCtx([{ status: 401, body: loginErrorBody() }]);
  await assertRejects(() => new GoCanvasClient(b.ctx).request("/me"), Error, "must be logged in");
});

Deno.test("client.request: a 204 resolves undefined; a non-JSON 200 is a clear error", async () => {
  const a = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new GoCanvasClient(a.ctx).request("/x"), undefined);
  const b = mockCtx([{ body: "<html>shell</html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(() => new GoCanvasClient(b.ctx).request("/x"), Error, "not JSON");
});

Deno.test("client.list: array body becomes items, headers become pagination", async () => {
  const { ctx } = mockCtx([{
    body: [{ id: 1 }, { id: 2 }],
    headers: { "content-type": "application/json", "current-page": "1", "total-pages": "2" },
  }]);
  const out = await new GoCanvasClient(ctx).list("/forms", { page: 1 });
  assertEquals(out.items.length, 2);
  assertEquals(out.pagination.nextPage, 2);
});

Deno.test("client.list: a non-array body yields no items rather than crashing", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: true } }]);
  assertEquals((await new GoCanvasClient(ctx).list("/forms")).items, []);
});

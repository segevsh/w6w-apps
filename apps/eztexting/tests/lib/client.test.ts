import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asStringArray,
  compact,
  encodePathSegment,
  EzTextingClient,
  formatEzTextingError,
} from "../../lib/client.ts";
import { API_ROOT, apiError, mockCtx } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("asStringArray: accepts arrays and comma-separated strings, trims, drops blanks", () => {
  assertEquals(asStringArray(["1", " 2 ", ""]), ["1", "2"]);
  assertEquals(asStringArray("1, 2,,3"), ["1", "2", "3"]);
  assertEquals(asStringArray(""), undefined);
  assertEquals(asStringArray(undefined), undefined);
});

Deno.test("encodePathSegment: escapes +, spaces and slashes", () => {
  assertEquals(encodePathSegment("+1 212/5"), "%2B1%20212%2F5");
});

Deno.test("client: an empty 200 body parses to undefined, not a JSON error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new EzTextingClient(ctx).json("/x"), undefined);
});

Deno.test("client: page() normalises a missing or odd envelope", async () => {
  const { ctx } = mockCtx([{ body: { content: [1, 2], totalElements: 9 } }, { body: {} }]);
  const c = new EzTextingClient(ctx);
  assertEquals(await c.page("/x"), {
    content: [1, 2],
    totalPages: 0,
    totalElements: 9,
    numberOfElements: 2,
  });
  assertEquals((await c.page("/x")).content, []);
});

Deno.test("client: array query values repeat the key; blanks are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EzTextingClient(ctx).json("/x", {
    query: { n: ["1", "2"], skip: "", none: undefined },
  });
  assertEquals(calls[0].url, `${API_ROOT}/x?n=1&n=2`);
});

Deno.test("client: a JSON body sets content-type; a GET sets none", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const c = new EzTextingClient(ctx);
  await c.json("/x", { method: "POST", body: { a: 1 } });
  await c.json("/x");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: errors carry status, path, the vendor message and advice", async () => {
  const { ctx } = mockCtx([{ status: 401, body: apiError(401, "Invalid username or password") }]);
  const err = await assertRejects(() => new EzTextingClient(ctx).json("/credits"), Error);
  assert(err.message.includes("401 for GET /v1/credits"), err.message);
  assert(err.message.includes("Invalid username or password"), err.message);
});

Deno.test("client: a 429 reports the documented retry-after header", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: "",
    headers: { "X-Rate-Limit-Retry-After-Milliseconds": "1500" },
  }]);
  const err = await assertRejects(() => new EzTextingClient(ctx).json("/x"), Error);
  assert(err.message.includes("retry after 1500 ms"), err.message);
});

Deno.test("formatEzTextingError: a non-JSON body is truncated rather than dumped", () => {
  const msg = formatEzTextingError(502, "GET", "/v1/x", "<html>" + "x".repeat(2000));
  assert(msg.length <= 1100, String(msg.length));
  assert(msg.includes("502"));
});

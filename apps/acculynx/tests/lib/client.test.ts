import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  AccuLynxClient,
  asOptionalJson,
  compact,
  encodeId,
  formatError,
  toIdList,
  truncate,
} from "../../lib/client.ts";
import { mockCtx, problemBody, queryOf } from "../_helpers.ts";

Deno.test("formatError: reads title, detail and traceId from problem+json", () => {
  const msg = formatError(
    400,
    "POST",
    "/api/v2/jobs",
    JSON.stringify(problemBody(400, "Bad", "no contact")),
  );
  assertEquals(msg, "AccuLynx 400 for POST /api/v2/jobs: Bad — no contact (traceId t-1)");
});

Deno.test("formatError: includes validation errors, reads {message} and plain text", () => {
  const withErrors = formatError(
    400,
    "POST",
    "/p",
    JSON.stringify({ title: "Invalid", errors: { a: ["x"] } }),
  );
  assert(withErrors.includes('{"a":["x"]}'));
  assertEquals(
    formatError(416, "GET", "/p", '{"message":"range invalid"}'),
    "AccuLynx 416 for GET /p: range invalid",
  );
  assertEquals(
    formatError(429, "GET", "/p", "Hourly rate limit exceeded.", "60"),
    "AccuLynx 429 for GET /p: Hourly rate limit exceeded. (retry after 60s)",
  );
  assertEquals(formatError(500, "GET", "/p", ""), "AccuLynx 500 for GET /p");
});

Deno.test("truncate / compact / encodeId / asOptionalJson", () => {
  assertEquals(truncate("abc", 5), "abc");
  assert(truncate("abcdefgh", 3).startsWith("abc…"));
  assertEquals(compact({ a: 0, b: false, c: "", d: null, e: undefined, f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  try {
    asOptionalJson("{", "label");
    assert(false);
  } catch (e) {
    assertEquals((e as Error).message, "label is not valid JSON");
  }
});

Deno.test("toIdList: array, JSON string, comma string, empty and bad input", () => {
  assertEquals(toIdList(["a", " b "], "x"), ["a", "b"]);
  assertEquals(toIdList('["a","b"]', "x"), ["a", "b"]);
  assertEquals(toIdList("a, b,,", "x"), ["a", "b"]);
  assertEquals(toIdList(undefined, "x"), []);
  assertEquals(toIdList("", "x"), []);
  try {
    toIdList("[bad", "ids");
    assert(false);
  } catch (e) {
    assertEquals((e as Error).message, "ids is not valid JSON");
  }
  try {
    toIdList({ a: 1 }, "ids");
    assert(false);
  } catch (e) {
    assertEquals((e as Error).message, "ids must be an array of ids");
  }
});

Deno.test("client: drops unset query values, keeps 0 and false", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new AccuLynxClient(ctx).get("/x", { a: 0, b: false, c: undefined, d: "", e: null });
  assertEquals(queryOf(calls[0].url), { a: "0", b: "false" });
});

Deno.test("client: an empty 2xx becomes { success: true }", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 201 }]);
  const client = new AccuLynxClient(ctx);
  assertEquals(await client.send("/a", { method: "PUT", body: {} }), { success: true });
  assertEquals(await client.send("/b", { method: "POST", body: {} }), { success: true });
});

Deno.test("client: a non-JSON success body is an error naming the route", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  await assertRejects(
    () => new AccuLynxClient(ctx).get("/x"),
    Error,
    "non-JSON body for GET /api/v2/x",
  );
});

Deno.test("client: sends json content-type only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new AccuLynxClient(ctx);
  await client.get("/x");
  await client.send("/y", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].headers.accept, "application/json");
});

Deno.test("client: a 429 text/plain body is surfaced with Retry-After", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "text/plain", "retry-after": "30" },
    body: "Hourly rate limit exceeded. Please try again later.",
  }]);
  await assertRejects(() => new AccuLynxClient(ctx).get("/x"), Error, "retry after 30s");
});

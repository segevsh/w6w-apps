import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_BASE,
  compact,
  encodeId,
  errorText,
  EverhourClient,
  isErrorEnvelope,
  one,
  queryString,
  toArray,
  toList,
  toNumberList,
  toObject,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: the API base is the single documented host", () => {
  assertEquals(API_BASE, "https://api.everhour.com");
});

Deno.test("encodeId: keeps the colon of ev:123 and escapes anything path-changing", () => {
  assertEquals(encodeId("ev:3000010034"), "ev:3000010034");
  assertEquals(encodeId(107), "107");
  assertEquals(encodeId(" as:1 "), "as:1");
  assertEquals(encodeId("a/../b?x=1#y"), "a%2F..%2Fb%3Fx%3D1%23y");
});

Deno.test("compact / queryString: drop undefined, null and empty, keep false and 0", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  assertEquals(queryString({ a: "x y", b: undefined, c: false }), "?a=x+y&c=false");
  assertEquals(queryString({}), "");
});

Deno.test("one: is 1 for true and omitted otherwise", () => {
  assertEquals(one(true), 1);
  assertEquals(one(false), undefined);
  assertEquals(one(undefined), undefined);
});

Deno.test("toList / toNumberList: accept CSV or arrays and reject non-numbers", () => {
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList(["x", " y "]), ["x", "y"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
  assertEquals(toNumberList("1, 2"), [1, 2]);
  assertEquals(toNumberList([3, 4]), [3, 4]);
  assertThrows(() => toNumberList("1,x"), Error, '"x" is not a number');
});

Deno.test("toObject / toArray: parse JSON strings, pass values, and fail loudly", () => {
  assertEquals(toObject('{"a":1}', "f"), { a: 1 });
  assertEquals(toObject({ a: 1 }, "f"), { a: 1 });
  assertEquals(toObject(undefined, "f"), undefined);
  assertThrows(() => toObject("{nope", "f"), Error, "f is not valid JSON");
  assertThrows(() => toObject("[1]", "f"), Error, "f must be a JSON object");
  assertEquals(toArray("[1,2]", "f"), [1, 2]);
  assertEquals(toArray(undefined, "f"), undefined);
  assertThrows(() => toArray("{}", "f"), Error, "f must be a JSON array");
  assertThrows(() => toArray("[", "f"), Error, "f is not valid JSON");
});

Deno.test("errorText / isErrorEnvelope: read Everhour's {code, message} body", () => {
  assertEquals(errorText({ code: 403, message: "Access denied" }), "Access denied");
  assertEquals(errorText("x"), undefined);
  assertEquals(isErrorEnvelope({ code: 403, message: "Access denied" }), true);
  assertEquals(isErrorEnvelope({ code: "403", message: "x" }), false);
  assertEquals(isErrorEnvelope([]), false);
  assertEquals(isErrorEnvelope(null), false);
});

Deno.test("EverhourClient.many: wraps a bare array and computes nextPage from limit", async () => {
  const full = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const a = await new EverhourClient(full.ctx).many("/x", { query: { limit: 2, page: 3 } });
  assertEquals(a, { items: [{ id: 1 }, { id: 2 }], count: 2, nextPage: 4 });
  const short = mockCtx([{ body: [{ id: 1 }] }]);
  const b = await new EverhourClient(short.ctx).many("/x", { query: { limit: 2 } });
  assertEquals(b.nextPage, null);
  const none = mockCtx([{ body: [] }]);
  assertEquals((await new EverhourClient(none.ctx).many("/x")).nextPage, null);
});

Deno.test("EverhourClient.many: a non-array answer is an error, not an empty list", async () => {
  const { ctx } = mockCtx([{ body: { items: [] } }]);
  await assertRejects(() => new EverhourClient(ctx).many("/x"), Error, "expected a JSON array");
});

Deno.test("EverhourClient.one: 204 becomes {ok: true}; objects pass through", async () => {
  const del = mockCtx([{ status: 204 }]);
  assertEquals(await new EverhourClient(del.ctx).one("/x", { method: "DELETE" }), { ok: true });
  const get = mockCtx([{ body: { id: 5 } }]);
  assertEquals(await new EverhourClient(get.ctx).one("/x"), { id: 5 });
});

Deno.test("EverhourClient: sends version + JSON headers and never a credential", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EverhourClient(ctx).one("/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("EverhourClient: errors carry status and message; 429 adds Retry-After", async () => {
  const forbidden = mockCtx([{ status: 403, body: { code: 403, message: "Access denied" } }]);
  await assertRejects(
    () => new EverhourClient(forbidden.ctx).one("/x"),
    Error,
    "Everhour 403: Access denied",
  );
  const limited = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "7" },
    body: { code: 429, message: "Too many requests" },
  }]);
  await assertRejects(() => new EverhourClient(limited.ctx).one("/x"), Error, "retry after 7s");
  const html = mockCtx([{ status: 502, body: "<html>bad gateway</html>", headers: {} }]);
  await assertRejects(() => new EverhourClient(html.ctx).one("/x"), Error, "Everhour 502");
});

Deno.test("EverhourClient: a 200 that is not JSON is an error", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(() => new EverhourClient(ctx).one("/x"), Error, "not JSON");
});

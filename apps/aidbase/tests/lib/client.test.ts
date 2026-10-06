import { assertEquals, assertRejects } from "@std/assert";
import { AidbaseClient, compact, encodeId, queryString, toList } from "../../lib/client.ts";
import { errBody, mockCtx } from "../_helpers.ts";

Deno.test("client helpers: encodeId, compact, queryString, toList", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: [1] }), { a: 1, f: [1] });
  assertEquals(queryString({ a: 1, b: undefined, c: "x y" }), "?a=1&c=x+y");
  assertEquals(queryString({}), "");
  assertEquals(toList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["x"]), ["x"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(" , "), undefined);
});

Deno.test("client.page: a last page has no cursor even if one is echoed", async () => {
  const { ctx } = mockCtx([{
    body: { success: true, data: { items: [1], total: 1, has_more: false, next_cursor: "x" } },
  }]);
  assertEquals(await new AidbaseClient(ctx).page("/knowledge"), {
    items: [1],
    total: 1,
    hasMore: false,
    nextCursor: null,
    count: 1,
  });
});

Deno.test("client: a 200 with success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errBody("nope") }]);
  await assertRejects(() => new AidbaseClient(ctx).done("/x"), Error, "nope");
});

Deno.test("client: a non-JSON 200 and a wrong-shaped data are rejected", async () => {
  const html = mockCtx([{ body: "<html></html>", headers: {} }]);
  await assertRejects(() => new AidbaseClient(html.ctx).object("/x"), Error, "not JSON");
  const arr = mockCtx([{ body: { success: true, data: [] } }]);
  await assertRejects(() => new AidbaseClient(arr.ctx).object("/x"), Error, "expected an object");
  const obj = mockCtx([{ body: { success: true, data: {} } }]);
  await assertRejects(() => new AidbaseClient(obj.ctx).array("/x"), Error, "expected an array");
});

Deno.test("client: a failure with a non-JSON body quotes the text; sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 502, body: "Bad Gateway", headers: {} }]);
  await assertRejects(() => new AidbaseClient(ctx).object("/x"), Error, "502: Bad Gateway");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client.done: a body-less success is { ok: true }", async () => {
  const { ctx } = mockCtx([{ body: { success: true } }]);
  assertEquals(await new AidbaseClient(ctx).done("/x", { method: "PUT" }), { ok: true });
});

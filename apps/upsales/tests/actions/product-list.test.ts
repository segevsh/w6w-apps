import { assert, assertEquals, assertRejects } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { API_ROOT, listEnvelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("product-list: GETs /products with paging, sort and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }, { id: 2 }], 42) }]);
  const out = await productList.execute({
    "limit": 50,
    "offset": 10,
    "sort": "id",
    "filter": { "user.id": "ne:1" },
  }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/products?`), true);
  assertEquals(queryOf(calls[0].url), {
    "limit": "50",
    "offset": "10",
    "sort": "id",
    "user.id": "ne:1",
  });
  assertEquals(out, { data: [{ id: 1 }, { id: 2 }], total: 42, limit: 1000, offset: 0 });
});

Deno.test("product-list: with no inputs it sends no query and never a token", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await productList.execute({}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/products`);
  assert(!calls[0].url.includes("token"));
});

Deno.test("product-list: a caller-supplied token filter key is dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await productList.execute({ filter: { token: "x", id: "gt:5" } }, ctx);
  assertEquals(queryOf(calls[0].url), { id: "gt:5" });
});

Deno.test("product-list: a filter given as a JSON string is parsed", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await productList.execute({ filter: '{"id":"gt:5"}' }, ctx);
  assertEquals(queryOf(calls[0].url), { id: "gt:5" });
});

Deno.test("product-list: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await productList.execute({}, ctx), Error, "401");
});

Deno.test("product-list: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(async () => await productList.execute({}, ctx), Error, "ThrottleLimit");
});

import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import productList from "../../actions/product-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {};

test("product-list: sends GET /v2/products with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "products": [{ "id": "a" }] } }]);
  await productList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/products");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

test("product-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "products": [{ "id": "a" }] } }]);
  assertEquals(await productList.execute(INPUT, ctx), { "products": [{ "id": "a" }] });
});

test("product-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(productList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

test("product-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(productList.execute(INPUT, ctx)), Error, "refused");
});

test("product-list: sends page_key and returns next_page_key as nextPageKey (paged, gumroad.com/api 2026-11-10)", async () => {
  const { ctx, calls } = mockCtx([
    { body: { "success": true, "products": [{ "id": "a" }], "next_page_key": "k2" } },
  ]);
  const out = await productList.execute({ pageKey: "k1" }, ctx);
  assertEquals(queryOf(calls[0].url), { "page_key": "k1" });
  assertEquals(out, { "products": [{ "id": "a" }], "nextPageKey": "k2" });
});

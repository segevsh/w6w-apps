import { assertEquals, assertRejects } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {};

Deno.test("product-list: sends GET /v2/products with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "products": [{ "id": "a" }] } }]);
  await productList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/products");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("product-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "products": [{ "id": "a" }] } }]);
  assertEquals(await productList.execute(INPUT, ctx), { "products": [{ "id": "a" }] });
});

Deno.test("product-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(productList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("product-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(productList.execute(INPUT, ctx)), Error, "refused");
});

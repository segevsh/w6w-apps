import { assertEquals, assertRejects } from "@std/assert";
import productGet from "../../actions/product-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==" };

Deno.test("product-get: sends GET /v2/products/productId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "product": { "id": "x1", "marker": true } },
  }]);
  await productGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("product-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "product": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await productGet.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("product-get: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(productGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("product-get: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(productGet.execute(INPUT, ctx)), Error, "refused");
});

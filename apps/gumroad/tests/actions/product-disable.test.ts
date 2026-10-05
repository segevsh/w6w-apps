import { assertEquals, assertRejects } from "@std/assert";
import productDisable from "../../actions/product-disable.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==" };

Deno.test("product-disable: sends PUT /v2/products/productId-1%3D%3D/disable with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "product": { "id": "x1", "marker": true } },
  }]);
  await productDisable.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D/disable");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("product-disable: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "product": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await productDisable.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("product-disable: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(productDisable.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("product-disable: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(productDisable.execute(INPUT, ctx)), Error, "refused");
});

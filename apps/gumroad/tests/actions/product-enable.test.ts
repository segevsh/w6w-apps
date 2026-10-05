import { assertEquals, assertRejects } from "@std/assert";
import productEnable from "../../actions/product-enable.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==" };

Deno.test("product-enable: sends PUT /v2/products/productId-1%3D%3D/enable with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "product": { "id": "x1", "marker": true } },
  }]);
  await productEnable.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D/enable");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("product-enable: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "product": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await productEnable.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("product-enable: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(productEnable.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("product-enable: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(productEnable.execute(INPUT, ctx)), Error, "refused");
});

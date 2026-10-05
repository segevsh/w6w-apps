import { assertEquals, assertRejects } from "@std/assert";
import productDelete from "../../actions/product-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==" };

Deno.test("product-delete: sends DELETE /v2/products/productId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "message": "deleted" } }]);
  await productDelete.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("product-delete: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "message": "deleted" } }]);
  assertEquals(await productDelete.execute(INPUT, ctx), { "message": "deleted" });
});

Deno.test("product-delete: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(productDelete.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("product-delete: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(productDelete.execute(INPUT, ctx)), Error, "refused");
});

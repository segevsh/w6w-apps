import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import productGet from "../../actions/product-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("product-get: calls GET /products/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { product_id: "1", name: "My Product" } }]);
  const out = await productGet.execute({ productId: "1" }, ctx) as { name: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/products/1");
  assertEquals(out.name, "My Product");
});

test("product-get: a slash pasted into the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await productGet.execute({ productId: "1/../../ping" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/products/1%2F..%2F..%2Fping");
});

test("product-get: a 404 surfaces the vendor's error text", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("The requested product cannot be identified."),
  }]);
  const err = await assertRejects(() =>
    Promise.resolve(productGet.execute({ productId: "x" }, ctx))
  );
  assertEquals(
    (err as Error).message.includes("The requested product cannot be identified."),
    true,
  );
});

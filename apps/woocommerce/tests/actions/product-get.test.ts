import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-get.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("product-get: GETs /products/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5 } }], { display });
  const result = await action.execute!({ productId: "5" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wc/v3/products/5");
  assertEquals(result, { id: 5 });
});

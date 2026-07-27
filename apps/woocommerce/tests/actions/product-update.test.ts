import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-update.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("product-update: PUTs /products/{id} with only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5 } }], { display });
  await action.execute!({ productId: "5", regularPrice: "12.00", status: "draft" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wc/v3/products/5");
  assertEquals(JSON.parse(calls[0].body!), { regular_price: "12.00", status: "draft" });
});

Deno.test("product-update: maps categories/tags to {id} objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5 } }], { display });
  await action.execute!({ productId: "5", categories: [1], tags: [2, 3] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    categories: [{ id: 1 }],
    tags: [{ id: 2 }, { id: 3 }],
  });
});

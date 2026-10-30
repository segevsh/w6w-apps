import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-delete.ts";

const display = { storeUrl: "https://shop.example.com" };

test("product-delete: DELETEs /products/{id} with force=true by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ productId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wp-json/wc/v3/products/42");
  assertEquals(url.searchParams.get("force"), "true");
});

test("product-delete: force=false moves to trash", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ productId: "42", force: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("force"), "false");
});

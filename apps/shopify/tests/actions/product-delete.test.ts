import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/product-delete.ts";

test("product-delete: DELETEs the product", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ productId: 5 }, ctx);
  assertEquals(calls[0].method, "DELETE");
});

test("product-delete: points at archiving as the reversible alternative", () => {
  assert(action.description?.includes("Archive"));
});

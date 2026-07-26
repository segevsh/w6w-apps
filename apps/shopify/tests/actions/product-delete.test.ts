import { assert, assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/product-delete.ts";

Deno.test("product-delete: DELETEs the product", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ productId: 5 }, ctx);
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("product-delete: points at archiving as the reversible alternative", () => {
  assert(action.description?.includes("Archive"));
});

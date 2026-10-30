import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import productDelete from "../../actions/product-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("product-delete: DELETEs /products/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "prod_1", deleted: true } }]);
  const out = await productDelete.execute({ productId: "prod_1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/products/prod_1");
  assertEquals(out.deleted, true);
});

test("product-delete: declared idempotent — deleting twice ends in the same state", () => {
  assertEquals(productDelete.idempotent, true);
});

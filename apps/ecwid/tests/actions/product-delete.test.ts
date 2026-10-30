import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import productDelete from "../../actions/product-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("product-delete: DELETEs /products/{id} and reports the vendor's deleteCount", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleteCount: 1 } }]);
  const out = await productDelete.execute({ productId: "692730761" }, ctx) as {
    deleteCount: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products/692730761");
  assertEquals(calls[0].body, null);
  assertEquals(out.deleteCount, 1);
});

test("product-delete: a deleteCount of 0 is returned, not swallowed", async () => {
  const { ctx } = mockCtx([{ body: { deleteCount: 0 } }]);
  assertEquals(await productDelete.execute({ productId: "1" }, ctx), { deleteCount: 0 });
});

test("product-delete: it is declared idempotent — a repeat leaves the product gone", () => {
  assertEquals(productDelete.idempotent, true);
});

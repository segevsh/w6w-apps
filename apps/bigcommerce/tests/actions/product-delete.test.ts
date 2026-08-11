import { assert, assertEquals } from "@std/assert";
import productDelete from "../../actions/product-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-delete: DELETEs one product and returns the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await productDelete.execute({ productId: 77 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products/77");
  assertEquals(out, { status: 204 });
});

Deno.test("product-delete: always addresses ONE product, never the filtered collection", async () => {
  // The collection form deletes everything matching a filter, with no undo.
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await productDelete.execute({ productId: 5 }, ctx);
  assert(pathOf(calls[0].url).endsWith("/catalog/products/5"), pathOf(calls[0].url));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(productDelete.params?.length, 1);
});

import { assert, assertEquals } from "@std/assert";
import variantList from "../../actions/variant-list.ts";
import productList from "../../actions/product-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("variant-list: GETs /v3/catalog/variants with the :in list filters", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 1 }]) }]);
  const out = await variantList.execute({ sku: "MUG-1", productIds: "77, 80" }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/variants");
  assertEquals(queryOf(calls[0].url), { sku: "MUG-1", "product_id:in": "77,80" });
  assertEquals(out.data, [{ id: 1 }]);
});

Deno.test("variant-list: is the ONLY action that searches by variant SKU", () => {
  // The Products endpoint's `sku` filter matches the product's own main SKU, as
  // its own vendor description says, so a variant SKU there returns nothing.
  const productSku = productList.params?.find((p) => p.key === "sku");
  assert(productSku?.hint?.includes("not a variant"), productSku?.hint);
  const variantSku = variantList.params?.find((p) => p.key === "sku");
  assertEquals(variantSku?.label, "Variant SKU");
});

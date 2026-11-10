import variantList from "../actions/variant-list.ts";
import { newRecordSnapshot, productIdParam, variantCategoryIdParam } from "../lib/triggers.ts";

/**
 * `GET /v2/products/:product_id/variant_categories/:variant_category_id/variants` "Retrieve all
 * of the existing variants in a variant category" returns every variant with no paging
 * parameters (https://gumroad.com/api, verified 2026-11-10).
 */
export default newRecordSnapshot<{ productId: string; variantCategoryId: string }>({
  key: "new-variant",
  title: "New Variant",
  description: "The run gets each variant added to a variant category of a Gumroad product.",
  action: variantList,
  params: [productIdParam, variantCategoryIdParam],
  input: ({ productId, variantCategoryId }) => ({ productId, variantCategoryId }),
  rows: (result) => (result as { variants?: unknown[] }).variants ?? [],
  output: [
    { key: "id", type: "string", label: "Variant ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "price_difference_cents", type: "number", label: "Price difference (cents)" },
  ],
  sample: {
    id: "lSC1XVfr2TC3WoCGY7YrUg==",
    name: "red",
    price_difference_cents: 100,
    max_purchase_count: null,
  },
});

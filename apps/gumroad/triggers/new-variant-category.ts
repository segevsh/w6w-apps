import variantCategoryList from "../actions/variant-category-list.ts";
import { newRecordSnapshot, productIdParam } from "../lib/triggers.ts";

/**
 * `GET /v2/products/:product_id/variant_categories` "Retrieve all of the existing variant
 * categories of a product" returns every category with no paging parameters
 * (https://gumroad.com/api, verified 2026-11-10).
 */
export default newRecordSnapshot<{ productId: string }>({
  key: "new-variant-category",
  title: "New Variant Category",
  description:
    "The run gets each variant category (size, colour, tier) added to a Gumroad product.",
  action: variantCategoryList,
  params: [productIdParam],
  input: ({ productId }) => ({ productId }),
  rows: (result) => (result as { variantCategories?: unknown[] }).variantCategories ?? [],
  output: [
    { key: "id", type: "string", label: "Variant category ID" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { id: "mN7CdHiwHaR9FlxKvF-n-g==", title: "colors" },
});

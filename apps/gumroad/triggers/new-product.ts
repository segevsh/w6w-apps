import productList from "../actions/product-list.ts";
import { newRecordSnapshot } from "../lib/triggers.ts";

/**
 * `GET /v2/products` "Retrieve all of the existing products" returns the whole catalogue with no
 * paging parameters, so the collection is bounded by what one seller has published
 * (https://gumroad.com/api, verified 2026-11-10).
 */
export default newRecordSnapshot({
  key: "new-product",
  title: "New Product",
  description: "The run gets each product that appears in the seller's Gumroad catalogue.",
  action: productList,
  input: () => ({}),
  rows: (result) => (result as { products?: unknown[] }).products ?? [],
  output: [
    { key: "id", type: "string", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "price", type: "number", label: "Price (cents)" },
    { key: "published", type: "boolean", label: "Published" },
  ],
  sample: {
    id: "A-m3CDDC5dlrSdKZp0RFhA==",
    name: "Pencil Icon PSD",
    price: 100,
    published: true,
  },
});

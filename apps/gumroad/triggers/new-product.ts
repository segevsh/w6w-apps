import productList from "../actions/product-list.ts";
import { newRecordSnapshot } from "../lib/triggers.ts";

/**
 * `GET /v2/products` is paged: the response carries `next_page_key` while more products follow
 * (10 per page, newest first), which goes back as `page_key` (https://gumroad.com/api, verified
 * 2026-11-10). The snapshot reads every page (bounded by `SNAPSHOT_MAX_PAGES`) so it sees the whole
 * catalogue, not the 10 newest.
 */
export default newRecordSnapshot({
  key: "new-product",
  title: "New Product",
  description: "The run gets each product that appears in the seller's Gumroad catalogue.",
  action: productList,
  input: () => ({}),
  rows: (result) => (result as { products?: unknown[] }).products ?? [],
  next: (result) => (result as { nextPageKey?: string }).nextPageKey,
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

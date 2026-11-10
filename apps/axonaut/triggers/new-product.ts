import { snapshotTrigger } from "../lib/snapshot.ts";
import productList from "../actions/product-list.ts";

/**
 * `GET /api/v2/products` (https://axonaut.com/api/v2/doc, 2026-11-10) is served unordered and unfiltered, one page per `page`
 * header with no total, so each check reads every page and diffs the ids against the previous check (added only).
 */
export default snapshotTrigger({
  key: "new-product",
  title: "New Product",
  description: "The run gets each product newly added to the Axonaut catalogue.",
  action: productList as never,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "product_code", type: "string", label: "Product code" },
    { key: "price", type: "number", label: "Price" },
  ],
  sample: { id: 3301, name: "Consulting day", product_code: "CONS-1", price: 800 },
});

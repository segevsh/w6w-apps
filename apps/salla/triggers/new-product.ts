import { pagedSnapshotTrigger } from "../lib/triggers.ts";
import productList from "../actions/product-list.ts";

/**
 * `product-list` documents no sort order and no created-since filter
 * (https://docs.salla.dev/pagination.md and the endpoint page), so each check reads the whole list
 * (read up to 50 pages (3000 products)) and diffs ids.
 */
export default pagedSnapshotTrigger({
  key: "new-product",
  title: "New Product",
  description: "The run gets each product newly added to the store.",
  action: productList,
  maxPages: 50,
  minIntervalMs: 900000,
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "sku", type: "string", label: "SKU" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: 1101, name: "Example Product", sku: "SKU-1", status: "sale" },
});

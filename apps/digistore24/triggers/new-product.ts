import { snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/list-products.ts";

type Item = Record<string, unknown>;

/**
 * `listProducts` returns the account's whole product catalogue in one response (no paging
 * parameters, `digistore24.com/api/docs/paths/listProducts.yaml`); the action wraps the array as
 * `{ items }`. A catalogue is small and bounded, so it is snapshotted and diffed.
 */
export default snapshotFeed({
  key: "new-product",
  title: "New Product",
  description: "The run gets each product newly created in the Digistore24 account.",
  action,
  items: (result) => (result as { items?: Item[] }).items ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "language", type: "string", label: "Language" },
    { key: "product_group_name", type: "string", label: "Product group" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 39,
    name: "The Weight Loss Cake",
    language: "en",
    product_group_name: "My happiness products",
    created_at: "2026-11-09 10:00:00",
  },
});

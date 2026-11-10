import { pollFromListAction } from "../../_shared/poll/mod.ts";
import productList from "../actions/product-list.ts";

export default pollFromListAction({
  key: "new-product",
  title: "New Product",
  description: "The run gets each product first seen in the store catalog.",
  action: productList,
  input: () => ({ sort: "id", direction: "desc", limit: 100, page: 1 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Product name" },
    { key: "date_modified", type: "string", label: "Modified at" },
  ],
  sample: { id: 101, name: "Canvas Tote", date_modified: "2026-11-10T10:00:00+00:00" },
  maxPages: 1,
});

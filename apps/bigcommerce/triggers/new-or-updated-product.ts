import { pollFromListAction } from "../../_shared/poll/mod.ts";
import productList from "../actions/product-list.ts";

export default pollFromListAction({
  key: "new-or-updated-product",
  title: "New or Updated Product",
  description: "The run gets each product when it is first seen or its modification time changes.",
  action: productList,
  input: () => ({ sort: "date_modified", direction: "desc", limit: 100, page: 1 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const product = item as { id?: unknown; date_modified?: unknown };
    return `${String(product.id ?? "")}:${String(product.date_modified ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Product name" },
    { key: "date_modified", type: "string", label: "Modified at" },
  ],
  sample: { id: 101, name: "Canvas Tote", date_modified: "2026-11-10T10:00:00+00:00" },
  maxPages: 1,
});

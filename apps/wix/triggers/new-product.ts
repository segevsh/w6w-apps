import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import queryProducts from "../actions/query-products.ts";

// Wix Stores Catalog V3 Query Products: `createdDate` is sortable ASC/DESC, so the newest products come first (https://dev.wix.com/docs/rest/business-solutions/stores/catalog-v3/products-v3/query-products, Supported Filters and Sorting, verified 2026-11-10). Newest-first, brief 9.1 a.
export default pollFromListAction<Record<string, never>>({
  key: "new-product",
  title: "New Product",
  description: "The run gets each newly created Wix Stores product.",
  action: queryProducts as unknown as ActionDefinition,
  input: () => ({ sortFieldName: "createdDate", sortOrder: "DESC", limit: 50 }),
  items: (result) => (result as { products?: unknown[] }).products ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [],
  output: [
    { key: "id", type: "string", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdDate", type: "string", label: "Created at" },
    { key: "updatedDate", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "sample-product-id",
    name: "T-shirt",
    createdDate: "2026-11-09T10:00:00.000Z",
    updatedDate: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});

import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import queryProducts from "../actions/query-products.ts";

// Wix Stores Catalog V3 Query Products: `updatedDate` is sortable ASC/DESC, so the most recently edited products come first (https://dev.wix.com/docs/rest/business-solutions/stores/catalog-v3/products-v3/query-products, verified 2026-11-10). The id carries the update stamp, so an edit is a new event (brief 9.2).
export default pollFromListAction<Record<string, never>>({
  key: "new-or-updated-product",
  title: "New or Updated Product",
  description: "The run gets each Wix Stores product that is created or edited.",
  action: queryProducts as unknown as ActionDefinition,
  input: () => ({ sortFieldName: "updatedDate", sortOrder: "DESC", limit: 50 }),
  items: (result) => (result as { products?: unknown[] }).products ?? [],
  idOf: (item) => {
    const p = item as { id?: unknown; updatedDate?: unknown };
    return `${p.id ?? ""}:${p.updatedDate ?? ""}`;
  },
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
    updatedDate: "2026-11-10T10:00:00.000Z",
  },
  maxPages: 1,
});

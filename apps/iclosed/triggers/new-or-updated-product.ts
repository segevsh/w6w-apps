import { pollFromListAction } from "../../_shared/poll/mod.ts";
import productList from "../actions/product-list.ts";

/**
 * Same endpoint as `new-product`, sorted by `updatedAt` descending; the dedupe id carries
 * `updatedAt`, so an edited product is a new event (https://developer.iclosed.io, verified
 * 2026-11-10).
 */
export default pollFromListAction({
  key: "new-or-updated-product",
  title: "New or Updated Product",
  description: "The run gets each iClosed product that is created or edited, once per edit.",
  action: productList,
  input: () => ({ orderColumn: "updatedAt", orderBy: "desc", limit: 100, page: 0 }),
  items: (result) => (result as { data?: { products?: unknown[] } }).data?.products ?? [],
  idOf: (item) => {
    const product = item as { id: unknown; updatedAt?: unknown };
    return `${String(product.id)}:${String(product.updatedAt ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "price", type: "number", label: "Price" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 12,
    name: "Coaching package",
    price: 3000,
    contractValue: 9000,
    createdAt: "2026-11-10T08:00:00.000Z",
    updatedAt: "2026-11-10T10:15:00.000Z",
  },
});

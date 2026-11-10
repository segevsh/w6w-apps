import { pollFromListAction } from "../../_shared/poll/mod.ts";
import productList from "../actions/product-list.ts";

/**
 * `GET /v1/products` sorted by `createdAt` descending, 100 per page (the documented maximum is
 * 200) (https://developer.iclosed.io, OpenAPI `Get Products`, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-product",
  title: "New Product",
  description: "The run gets each product newly created in iClosed.",
  action: productList,
  input: () => ({ orderColumn: "createdAt", orderBy: "desc", limit: 100, page: 0 }),
  items: (result) => (result as { data?: { products?: unknown[] } }).data?.products ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "price", type: "number", label: "Price" },
    { key: "contractValue", type: "number", label: "Contract value" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 12,
    name: "Coaching package",
    price: 2500,
    contractValue: 7500,
    createdAt: "2026-11-10T08:00:00.000Z",
    updatedAt: "2026-11-10T08:00:00.000Z",
  },
});

import productList from "../actions/product-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each Keap product that is new or was edited (`GET /rest/v2/products`, `order_by=last_updated_time desc`; Keap offers no created-time sort for products). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-product",
  title: "New or Updated Product",
  description:
    "The run gets each Keap product that is new or was edited (`GET /rest/v2/products`, `order_by=last_updated_time desc`; Keap offers no created-time sort for products).",
  action: productList,
  list: "products",
  orderBy: "last_updated_time desc",
  stamp: "update_time",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "sku", type: "string", label: "SKU" },
    { key: "update_time", type: "string", label: "Updated at" },
  ],
  sample: { id: "1", name: "Widget", sku: "W-1", update_time: "2026-11-10T12:30:00.000Z" },
});

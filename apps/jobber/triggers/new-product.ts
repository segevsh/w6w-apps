import { snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/product-list.ts";

/**
 * `product-list` (`products` connection). The query takes no sort argument, so the catalogue of
 * products and services is walked 100 at a time and diffed; hidden entries stay out (Jobber's default).
 */
export default snapshotFeed({
  key: "new-product",
  title: "New Product or Service",
  description: "The run gets each product or service newly added to the Jobber catalogue.",
  action,
  field: "products",
  input: ({ after, first }) => ({ first, after }),
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Product or service ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "category", type: "string", label: "Category (PRODUCT or SERVICE)" },
    { key: "defaultUnitCost", type: "number", label: "Default unit cost" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL1Byb2R1Y3RPclNlcnZpY2UvMQ==",
    name: "Lawn mowing",
    category: "SERVICE",
    defaultUnitCost: 45,
  },
});

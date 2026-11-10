import type { TriggerDefinition } from "@w6w/types";
import { sinceTrigger } from "../lib/triggers.ts";
import productList from "../actions/product-list.ts";

const trigger: TriggerDefinition = sinceTrigger({
  key: "new-product",
  title: "New Product",
  description: "The run gets each newly created product.",
  action: productList,
  stampField: "created_at",
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "product_name", type: "string", label: "Product name" },
    { key: "status", type: "string", label: "Status" },
    { key: "pricing_type", type: "string", label: "Pricing type" },
    { key: "price", type: "number", label: "Price (minor units)" },
    { key: "created_at", type: "string", label: "Created at (UTC)" },
  ],
  sample: {
    id: 1337,
    product_name: "Book",
    status: "live",
    pricing_type: "one_time",
    price: 1025,
    created_at: "2026-11-10 09:15:00",
  },
});
export default trigger;

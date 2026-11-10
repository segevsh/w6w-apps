import type { TriggerDefinition } from "@w6w/types";
import { sinceTrigger } from "../lib/triggers.ts";
import subscriptionList from "../actions/subscription-list.ts";

const trigger: TriggerDefinition = sinceTrigger({
  key: "new-subscription",
  title: "New Subscription",
  description: "The run gets each newly created subscription.",
  action: subscriptionList,
  stampField: "created_at",
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "order_id", type: "number", label: "Order ID" },
    { key: "product_id", type: "number", label: "Product ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type" },
    { key: "created_at", type: "string", label: "Created at (UTC)" },
  ],
  sample: {
    id: 1337,
    customer_id: 1234,
    order_id: 1001,
    product_id: 1001,
    status: "active",
    type: "recurring_subscription",
    created_at: "2026-11-10 09:15:00",
  },
});
export default trigger;

import type { ActionDefinition } from "@w6w/types";
import { chargebeeTrigger } from "../lib/triggers.ts";
import listSubscriptions from "../actions/list-subscriptions.ts";

export default chargebeeTrigger({
  key: "new-or-updated-subscription",
  title: "New or Updated Subscription",
  description: "The run gets each subscription when it is created and each time it is updated.",
  action: listSubscriptions as ActionDefinition,
  wrapper: "subscription",
  sortAttribute: "updated_at",
  stamp: "updated_at",
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "customer_id", type: "string", label: "Customer ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
    { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
  ],
  sample: {
    id: "sub_1",
    customer_id: "cust_1",
    status: "active",
    created_at: 1762689600,
    updated_at: 1762689600,
  },
});

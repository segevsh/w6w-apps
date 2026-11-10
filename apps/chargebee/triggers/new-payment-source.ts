import type { ActionDefinition } from "@w6w/types";
import { chargebeeTrigger } from "../lib/triggers.ts";
import listPaymentSources from "../actions/list-payment-sources.ts";

export default chargebeeTrigger({
  key: "new-payment-source",
  title: "New Payment Source",
  description: "The run gets each newly created payment source.",
  action: listPaymentSources as ActionDefinition,
  wrapper: "payment_source",
  sortAttribute: "created_at",
  output: [
    { key: "id", type: "string", label: "Payment source ID" },
    { key: "customer_id", type: "string", label: "Customer ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
    { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
  ],
  sample: {
    id: "pm_1",
    customer_id: "cust_1",
    type: "card",
    status: "valid",
    created_at: 1762689600,
    updated_at: 1762689600,
  },
});

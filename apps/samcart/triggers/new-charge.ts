import type { TriggerDefinition } from "@w6w/types";
import { sinceTrigger } from "../lib/triggers.ts";
import chargeList from "../actions/charge-list.ts";

const trigger: TriggerDefinition = sinceTrigger({
  key: "new-charge",
  title: "New Charge",
  description: "The run gets each newly created successful charge.",
  action: chargeList,
  stampField: "created_at",
  output: [
    { key: "id", type: "number", label: "Charge ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "order_id", type: "number", label: "Order ID" },
    { key: "total", type: "number", label: "Total (minor units)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "created_at", type: "string", label: "Created at (UTC)" },
  ],
  sample: {
    id: 1337,
    customer_id: 1234,
    order_id: 1001,
    total: 10025,
    currency: "USD",
    created_at: "2026-11-10 09:15:00",
  },
});
export default trigger;

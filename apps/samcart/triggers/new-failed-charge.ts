import type { TriggerDefinition } from "@w6w/types";
import { sinceTrigger } from "../lib/triggers.ts";
import failedChargeList from "../actions/failed-charge-list.ts";

const trigger: TriggerDefinition = sinceTrigger({
  key: "new-failed-charge",
  title: "New Failed Charge",
  description: "The run gets each charge the processor newly declined.",
  action: failedChargeList,
  stampField: "created_at",
  output: [
    { key: "id", type: "number", label: "Failed charge ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "order_id", type: "number", label: "Order ID" },
    { key: "error", type: "string", label: "Decline message" },
    { key: "total", type: "number", label: "Total (minor units)" },
    { key: "created_at", type: "string", label: "Created at (UTC)" },
  ],
  sample: {
    id: 1337,
    customer_id: 1234,
    order_id: 1001,
    error: "Your card was declined",
    total: 10025,
    created_at: "2026-11-10 09:15:00",
  },
});
export default trigger;

import type { TriggerDefinition } from "@w6w/types";
import { checkRefunds } from "../lib/triggers.ts";

const trigger: TriggerDefinition = {
  key: "new-refund",
  title: "New Refund",
  description: "The run gets each newly issued refund, on any charge.",
  output: [
    { key: "id", type: "number", label: "Refund ID" },
    { key: "charge_id", type: "number", label: "Charge ID" },
    { key: "refund_amount", type: "number", label: "Refunded amount (minor units)" },
    { key: "charge_refund_status", type: "string", label: "Charge refund status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "created_at", type: "string", label: "Created at (UTC)" },
  ],
  sample: {
    id: 1337,
    charge_id: 1337,
    refund_amount: 1525,
    charge_refund_status: "refunded",
    currency: "USD",
    created_at: "2026-11-10 09:15:00",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => checkRefunds(state, ctx),
};
export default trigger;

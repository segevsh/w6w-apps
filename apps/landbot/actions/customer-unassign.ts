import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Unassign Customer — Remove the customer from its current agent. Landbot refuses with 412 when it is assigned to another agent.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerUnassign: ActionDefinition<Input> = {
  key: "customer-unassign",
  type: "perform",
  resource: "customer",
  title: "Unassign Customer",
  description:
    "Remove the customer from its current agent. Landbot refuses with 412 when it is assigned to another agent.",
  idempotent: true,
  params: [
    {
      "key": "customerId",
      "label": "Customer ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot customer id (from List Customers).",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/unassign/`, {
      method: "PUT",
    });
  },
};

export default customerUnassign;

import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Assign Customer to Me — Assign the customer to the agent that owns the token. Landbot refuses with 412 when another agent already has it.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerAssign: ActionDefinition<Input> = {
  key: "customer-assign",
  type: "perform",
  resource: "customer",
  title: "Assign Customer to Me",
  description:
    "Assign the customer to the agent that owns the token. Landbot refuses with 412 when another agent already has it.",
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
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/assign/`, {
      method: "PUT",
    });
  },
};

export default customerAssign;

import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Assign Customer to Agent — Assign the customer to a specific agent.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  agentId: number;
}

const customerAssignAgent: ActionDefinition<Input> = {
  key: "customer-assign-agent",
  type: "perform",
  resource: "customer",
  title: "Assign Customer to Agent",
  description: "Assign the customer to a specific agent.",
  idempotent: true,
  params: [
    {
      "key": "customerId",
      "label": "Customer ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot customer id (from List Customers).",
    },
    {
      "key": "agentId",
      "label": "Agent ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot agent id.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).done(
      `/customers/${encodeId(input.customerId)}/assign/${encodeId(input.agentId)}/`,
      { method: "PUT" },
    );
  },
};

export default customerAssignAgent;

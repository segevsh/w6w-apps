import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Archive Customer — Archive a customer. Landbot refuses with 412 when the customer is assigned to another agent.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerArchive: ActionDefinition<Input> = {
  key: "customer-archive",
  type: "perform",
  resource: "customer",
  title: "Archive Customer",
  description:
    "Archive a customer. Landbot refuses with 412 when the customer is assigned to another agent.",
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
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/archive/`, {
      method: "PUT",
    });
  },
};

export default customerArchive;

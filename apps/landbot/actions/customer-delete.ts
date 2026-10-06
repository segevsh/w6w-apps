import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Delete Customer — Permanently delete a customer and its conversation.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Permanently delete a customer and its conversation.",
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
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/`, {
      method: "DELETE",
    });
  },
};

export default customerDelete;

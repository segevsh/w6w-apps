import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Unblock Customer — Unblock a previously blocked customer.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerUnblock: ActionDefinition<Input> = {
  key: "customer-unblock",
  type: "perform",
  resource: "customer",
  title: "Unblock Customer",
  description: "Unblock a previously blocked customer.",
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
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/unblock/`, {
      method: "PUT",
    });
  },
};

export default customerUnblock;

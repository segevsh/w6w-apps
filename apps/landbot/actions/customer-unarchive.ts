import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Unarchive Customer — Restore an archived customer.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerUnarchive: ActionDefinition<Input> = {
  key: "customer-unarchive",
  type: "perform",
  resource: "customer",
  title: "Unarchive Customer",
  description: "Restore an archived customer.",
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
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/unarchive/`, {
      method: "PUT",
    });
  },
};

export default customerUnarchive;

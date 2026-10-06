import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Opt Customer Out — Delete the customer's WhatsApp opt-ins. Landbot refuses with 412 when the customer has not opted in.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerOptOut: ActionDefinition<Input> = {
  key: "customer-opt-out",
  type: "perform",
  resource: "customer",
  title: "Opt Customer Out",
  description:
    "Delete the customer's WhatsApp opt-ins. Landbot refuses with 412 when the customer has not opted in.",
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
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/opt_out/`, {
      method: "DELETE",
    });
  },
};

export default customerOptOut;

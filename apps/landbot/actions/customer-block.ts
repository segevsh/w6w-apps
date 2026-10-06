import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Block Customer — Block a customer so they can no longer message the bot.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
}

const customerBlock: ActionDefinition<Input> = {
  key: "customer-block",
  type: "perform",
  resource: "customer",
  title: "Block Customer",
  description: "Block a customer so they can no longer message the bot.",
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
    return new LandbotClient(ctx).done(`/customers/${encodeId(input.customerId)}/block/`, {
      method: "PUT",
    });
  },
};

export default customerBlock;

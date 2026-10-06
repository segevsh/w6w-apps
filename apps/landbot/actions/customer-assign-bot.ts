import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Assign Customer to Bot — Hand the customer to a bot. By default the bot starts at once at its start node; set a node to start elsewhere, or turn launch off to assign without starting.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  botId: number;
  launch?: boolean;
  node?: string;
}

const customerAssignBot: ActionDefinition<Input> = {
  key: "customer-assign-bot",
  type: "perform",
  resource: "customer",
  title: "Assign Customer to Bot",
  description:
    "Hand the customer to a bot. By default the bot starts at once at its start node; set a node to start elsewhere, or turn launch off to assign without starting.",
  idempotent: false,
  params: [
    {
      "key": "customerId",
      "label": "Customer ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot customer id (from List Customers).",
    },
    {
      "key": "botId",
      "label": "Bot ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot bot id.",
    },
    {
      "key": "launch",
      "label": "Launch immediately",
      "type": "boolean",
      "hint": "Start the bot straight away (Landbot default: true).",
    },
    {
      "key": "node",
      "label": "Start node",
      "type": "string",
      "hint": "Node id to start at instead of the bot's start node.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).done(
      `/customers/${encodeId(input.customerId)}/assign_bot/${encodeId(input.botId)}/`,
      {
        method: "PUT",
        body: compact({ launch: input.launch, node: input.node }),
      },
    );
  },
};

export default customerAssignBot;

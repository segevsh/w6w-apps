import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";

interface Input {
  messageIds: string[];
}

/** Delivery and engagement timestamps (attempted, delivered, failed, read, clicked, replied) for up to 100 messages. */
const messageAnalyticsGet: ActionDefinition<Input> = {
  key: "message-analytics-get",
  type: "read",
  resource: "message",
  title: "Get Message Analytics",
  description:
    "Delivery and engagement timestamps (attempted, delivered, failed, read, clicked, replied) for up to 100 messages.",
  params: [
    {
      "key": "messageIds",
      "label": "Message IDs",
      "type": "json",
      "required": true,
      "hint": "Array of 1-100 message ids.",
    },
  ],
  output: [
    { "key": "results", "type": "array", "label": "One analytics entry per message" },
  ],

  execute(input, ctx) {
    if (!Array.isArray(input.messageIds) || input.messageIds.length === 0) {
      throw new Error("Superchat: message IDs must be a non-empty array");
    }
    return new SuperchatClient(ctx).request("/analytics/messages", {
      query: { message_ids: input.messageIds },
    });
  },
};

export default messageAnalyticsGet;

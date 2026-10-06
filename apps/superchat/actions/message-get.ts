import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/** Fetch one message by ID. */
const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Fetch one message by ID.",
  params: [
    { "key": "messageId", "label": "Message ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
    { "key": "status", "type": "string", "label": "Delivery status" },
    { "key": "content", "type": "array", "label": "Content" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/messages/${seg(input.messageId)}`);
  },
};

export default messageGet;

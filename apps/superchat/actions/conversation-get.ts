import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
}

/** Fetch one conversation by ID. */
const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Fetch one conversation by ID.",
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
    { "key": "status", "type": "string", "label": "open | done | spam | archived | snoozed" },
    { "key": "contacts", "type": "array", "label": "Contacts" },
    { "key": "channel", "type": "object", "label": "Channel" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/conversations/${seg(input.conversationId)}`);
  },
};

export default conversationGet;

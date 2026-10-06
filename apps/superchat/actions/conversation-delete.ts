import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
}

/** Delete a conversation. This cannot be undone. */
const conversationDelete: ActionDefinition<Input> = {
  key: "conversation-delete",
  type: "perform",
  resource: "conversation",
  title: "Delete Conversation",
  description: "Delete a conversation. This cannot be undone.",
  idempotent: true,
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/conversations/${seg(input.conversationId)}`, {
      method: "DELETE",
    });
  },
};

export default conversationDelete;

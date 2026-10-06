import type { ActionDefinition } from "@w6w/types";
import { RingoverClient, seg } from "../lib/client.ts";

interface Input {
  conversationId: number;
}

const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Fetch one conversation: members, tags, unread count and the last message.",
  params: [
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: [
    { key: "conversation_id", type: "number", label: "Conversation ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "name", type: "string", label: "Name" },
    { key: "unread_messages_count", type: "number", label: "Unread messages" },
    { key: "last_message", type: "object", label: "Last message" },
  ],

  execute(input, ctx) {
    return new RingoverClient(ctx).request("GET", `/conversations/${seg(input.conversationId)}`);
  },
};

export default conversationGet;

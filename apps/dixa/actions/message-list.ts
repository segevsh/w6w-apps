import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description:
    "List a conversation's messages. Each carries a channel-specific `attributes` block (email, chat, phone, SMS…) discriminated by `_type`.",
  params: [conversationIdParam],
  output: [{ key: "data", type: "array", label: "Messages" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json(
      `/conversations/${conversationId(input.conversationId)}/messages`,
    );
  },
};

export default messageList;

import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
}

const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description:
    "Fetch one conversation: channel, state, requester, assignment, queue and custom attributes.",
  params: [conversationIdParam],
  output: [{ key: "data", type: "object", label: "The conversation" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json(`/conversations/${conversationId(input.conversationId)}`);
  },
};

export default conversationGet;

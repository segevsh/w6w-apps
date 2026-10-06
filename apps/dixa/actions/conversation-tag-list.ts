import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
}

const conversationTagList: ActionDefinition<Input> = {
  key: "conversation-tag-list",
  type: "search",
  resource: "tag",
  title: "List Conversation Tags",
  description: "List the tags currently on a conversation.",
  params: [conversationIdParam],
  output: [{ key: "data", type: "array", label: "Tags: { id, name, color, state }" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json(`/conversations/${conversationId(input.conversationId)}/tags`);
  },
};

export default conversationTagList;

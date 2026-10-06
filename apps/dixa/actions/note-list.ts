import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
}

const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "search",
  resource: "note",
  title: "List Internal Notes",
  description: "List the internal notes on a conversation.",
  params: [conversationIdParam],
  output: [{ key: "data", type: "array", label: "Notes" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json(`/conversations/${conversationId(input.conversationId)}/notes`);
  },
};

export default noteList;

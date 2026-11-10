import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import commentsList from "../actions/conversation-comments-list.ts";

export default pollFromListAction({
  key: "new-comment",
  title: "New Conversation Comment",
  description: "The run gets each new internal comment on the selected conversation.",
  action: commentsList as unknown as ActionDefinition,
  input: (params: { conversationId: string }) => ({
    id: params.conversationId,
    limit: 10,
    until: 0,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "conversationId", label: "Conversation ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Comment ID" }],
  sample: { id: "comment-new", created_at: 1794225600 },
  maxPages: 1,
});

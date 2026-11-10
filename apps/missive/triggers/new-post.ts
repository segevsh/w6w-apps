import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import postsList from "../actions/conversation-posts-list.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Conversation Post",
  description: "The run gets each new post on the selected conversation.",
  action: postsList as unknown as ActionDefinition,
  input: (params: { conversationId: string }) => ({
    id: params.conversationId,
    limit: 10,
    until: 0,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "conversationId", label: "Conversation ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Post ID" }],
  sample: { id: "post-new", created_at: 1794225600 },
  maxPages: 1,
});

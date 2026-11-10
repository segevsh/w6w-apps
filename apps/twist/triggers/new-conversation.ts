import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import conversationList from "../actions/conversation-list.ts";

export default pollFromListAction({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each conversation newly created in the Twist workspace you choose.",
  action: conversationList as unknown as ActionDefinition,
  input: (params: { workspaceId?: number }) => ({
    workspaceId: params.workspaceId,
    limit: 100,
    // Twist: order is by conversation id (not last_active) "if before_id or after_id are used".
    afterId: 1,
    orderBy: "desc",
  }),
  params: [conversationList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Conversation ID" }],
  sample: { id: 101, title: "Project planning" },
});

import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import conversationList from "../actions/conversation-list.ts";

export default pollFromListAction({
  key: "new-or-updated-conversation",
  title: "New or Updated Conversation",
  description:
    "The run gets a conversation in the Twist workspace you choose each time it is created or becomes active again (a new message).",
  action: conversationList as unknown as ActionDefinition,
  // No before_id/after_id: Twist then orders conversations by last_active, most recent first.
  input: (params: { workspaceId?: number }) => ({
    workspaceId: params.workspaceId,
    limit: 100,
    orderBy: "desc",
  }),
  params: [conversationList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const conversation = item as { id?: unknown; last_active_ts?: unknown };
    return `${String(conversation.id ?? "")}:${String(conversation.last_active_ts ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "last_active_ts", type: "number", label: "Last active (Unix time)" },
  ],
  sample: { id: 101, title: "Project planning", last_active_ts: 1497970961 },
});

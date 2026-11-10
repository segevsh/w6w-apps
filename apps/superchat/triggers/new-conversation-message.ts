import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/conversation-messages-list.ts";

export default pollFromListAction<{ conversationId: string }>({
  key: "new-conversation-message",
  title: "New Conversation Message",
  description: "The run gets each newly created message in the selected conversation.",
  action: action as unknown as ActionDefinition,
  input: ({ conversationId }) => ({ conversationId, limit: 100 }),
  params: (action.params ?? []).filter((p) => p.key === "conversationId"),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Message ID" }],
  sample: { id: "message_101", createdAt: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});

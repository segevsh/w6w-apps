import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import conversationList from "../actions/conversation-list.ts";
export default pollFromListAction({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each newly created conversation.",
  action: conversationList as unknown as ActionDefinition,
  input: (p: { agentId: string }) => ({ agentId: p.agentId, limit: 100 }),
  params: [{ key: "agentId", label: "Agent ID", type: "string", required: true }],
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (v) =>
    String(
      (v as { id?: unknown; conversationId?: unknown }).id ??
        (v as { conversationId?: unknown }).conversationId ?? "",
    ),
  output: [{ key: "id", type: "string", label: "Conversation ID" }],
  sample: { id: "conversation-1" },
  maxPages: 1,
});

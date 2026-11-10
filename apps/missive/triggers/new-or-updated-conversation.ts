import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import conversationList from "../actions/conversation-list.ts";

export default pollFromListAction({
  key: "new-or-updated-conversation",
  title: "New or Updated Conversation",
  description: "The run gets each new or newly active conversation in the selected mailbox.",
  action: conversationList as unknown as ActionDefinition,
  input: (params: { mailbox: string; mailboxId?: string }) => ({ ...params, limit: 50, until: 0 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => {
    const conversation = item as { id?: unknown; last_activity_at?: unknown };
    return `${String(conversation.id ?? "")}:${String(conversation.last_activity_at ?? "")}`;
  },
  params: [
    { key: "mailbox", label: "Mailbox", type: "string", required: true },
    { key: "mailboxId", label: "Shared Label / Team ID", type: "string" },
  ],
  output: [{ key: "id", type: "string", label: "Conversation ID" }],
  sample: { id: "conversation-new", last_activity_at: 1794225600 },
  maxPages: 1,
});

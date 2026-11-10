import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import conversationList from "../actions/conversation-list.ts";

export default pollFromListAction({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each new conversation in the selected mailbox.",
  action: conversationList as unknown as ActionDefinition,
  input: (params: { mailbox: string; mailboxId?: string }) => ({ ...params, limit: 50 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [
    { key: "mailbox", label: "Mailbox", type: "string", required: true },
    { key: "mailboxId", label: "Shared Label / Team ID", type: "string" },
  ],
  output: [{ key: "id", type: "string", label: "Conversation ID" }],
  sample: { id: "conversation-new", last_activity_at: 1794225600 },
  maxPages: 1,
});

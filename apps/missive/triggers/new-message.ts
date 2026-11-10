import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import messagesList from "../actions/conversation-messages-list.ts";

export default pollFromListAction({
  key: "new-message",
  title: "New Conversation Message",
  description: "The run gets each new message on the selected conversation.",
  action: messagesList as unknown as ActionDefinition,
  input: (params: { conversationId: string }) => ({
    id: params.conversationId,
    limit: 10,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "conversationId", label: "Conversation ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Message ID" }],
  sample: { id: "message-new", delivered_at: 1794225600 },
  maxPages: 1,
});

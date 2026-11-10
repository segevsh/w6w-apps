import { snapshotTrigger } from "../lib/triggers.ts";
import listConversationMessages from "../actions/list-conversation-messages.ts";

export default snapshotTrigger({
  key: "new-conversation-message",
  title: "New Conversation Message",
  description: "The run gets each message newly added to one Hostaway guest conversation.",
  action: listConversationMessages,
  params: [{ key: "conversationId", label: "Conversation ID", type: "number", required: true }],
  input: (p, w) => ({ conversationId: p.conversationId, ...w }),
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "conversationId", type: "number", label: "Conversation ID" },
    { key: "body", type: "string", label: "Message text" },
    { key: "isIncoming", type: "number", label: "1 for a guest message" },
    { key: "status", type: "string", label: "Message status" },
  ],
  sample: {
    id: 325,
    conversationId: 1406,
    body: "What time is check-in?",
    isIncoming: 1,
    status: "sent",
  },
});

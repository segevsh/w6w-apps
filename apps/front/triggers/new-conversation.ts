import action from "../actions/conversation-list.ts";
import { conversationFeed } from "../lib/triggers.ts";

/**
 * `GET /conversations?sort_order=desc` — the company-wide list, newest activity first
 * (https://dev.frontapp.com/reference/list-conversations, verified 2026-11-10). Also delivers
 * what `conversation-search`, `inbox-conversation-list` and `contact-conversation-list` return:
 * those are narrower views of the same conversations.
 */
export default conversationFeed({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each Front conversation created after the trigger was switched on.",
  action,
  stampField: "created_at",
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "assignee", type: "object", label: "Assignee" },
    { key: "recipient", type: "object", label: "Recipient" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
  ],
  sample: {
    id: "cnv_1a2b3c",
    subject: "Where is my order?",
    status: "unassigned",
    assignee: null,
    recipient: { handle: "ada@example.test", role: "from" },
    tags: [],
    created_at: 1794304800.333,
    updated_at: 1794304800.333,
  },
});

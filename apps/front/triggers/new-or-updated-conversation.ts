import action from "../actions/conversation-list.ts";
import { conversationFeed } from "../lib/triggers.ts";

/**
 * Same request as `new-conversation`; the dedupe id carries `updated_at`
 * ("Timestamp at which the conversation was last updated", Front OpenAPI `ConversationResponse`,
 * verified 2026-11-10), so an edited or bumped conversation is a new event.
 */
export default conversationFeed({
  key: "new-or-updated-conversation",
  title: "New or Updated Conversation",
  description:
    "The run gets each Front conversation that is created or changes after the trigger was switched on, once per change.",
  action,
  stampField: "updated_at",
  idOf: (item) => `${String(item.id ?? "")}:${String(item.updated_at ?? "")}`,
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "assignee", type: "object", label: "Assignee" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
  ],
  sample: {
    id: "cnv_1a2b3c",
    subject: "Where is my order?",
    status: "assigned",
    assignee: { id: "tea_9z8y", email: "grace@example.test" },
    tags: [],
    created_at: 1794304800.333,
    updated_at: 1794308400.5,
  },
});

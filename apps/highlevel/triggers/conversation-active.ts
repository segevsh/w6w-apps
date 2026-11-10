import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listConversations from "../actions/list-conversations.ts";

/**
 * Newest-activity-first poll over `list-conversations` (`GET /conversations/search`). The endpoint
 * takes `sort` (`asc` | `desc`) and `sortBy` (`last_message_date` | `last_manual_message_date` |
 * `score_profile`) and `limit` (default 20)
 * (https://marketplace.gohighlevel.com/docs/ghl/conversations/search-conversation, verified
 * 2026-11-10), so `sort=desc&sortBy=last_message_date&limit=20` is the 20 most recently active
 * conversations. The documented item fields carry no activity timestamp, so a conversation is
 * reported the first time it appears in that window (id-only dedupe): a new conversation, or an
 * older one that goes active again. Later messages in a conversation already reported are not
 * repeated; the `inbound-message` / `outbound-message` webhook triggers cover every message.
 */
export default pollFromListAction({
  key: "conversation-active",
  title: "Conversation Became Active",
  description:
    "Checks the connected HighLevel location for conversations that newly appear among the most recently active ones: a brand-new conversation, or an older one that gets a new message after being quiet. Not repeated for further messages in a conversation already reported; use the message webhook triggers for every message. The run gets the conversation (contact, last message, unread count).",
  action: listConversations,
  input: () => ({ sort: "desc", sortBy: "last_message_date", limit: 20 }),
  items: (r) => (r as { conversations?: unknown[] }).conversations ?? [],
  idOf: (c) => String((c as { id: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "contactId", type: "string", label: "Contact ID" },
    { key: "locationId", type: "string", label: "Location ID" },
    { key: "fullName", type: "string", label: "Contact name" },
    { key: "email", type: "string", label: "Contact email" },
    { key: "phone", type: "string", label: "Contact phone" },
    { key: "lastMessageBody", type: "string", label: "Last message" },
    { key: "lastMessageType", type: "string", label: "Last message type" },
    { key: "unreadCount", type: "number", label: "Unread messages" },
  ],
  sample: {
    id: "sample-conversation-id",
    contactId: "sample-contact-id",
    locationId: "sample-location-id",
    fullName: "John Deo",
    email: "john@example.com",
    phone: "+15555550100",
    lastMessageBody: "This is a test message",
    lastMessageType: "TYPE_SMS",
    unreadCount: 1,
  },
});

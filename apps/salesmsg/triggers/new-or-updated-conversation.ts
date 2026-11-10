import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import conversationList from "../actions/conversation-list.ts";

/**
 * `GET /conversations` — the vendor documents the list as ordered by "the time of the last event"
 * (OpenAPI `Get user's conversations`), so the most recently active conversations come first. The
 * id carries `last_message_at`, so a new message in a known conversation is a new event.
 */
export default pollFromListAction({
  key: "new-or-updated-conversation",
  title: "New or Active Conversation",
  description:
    "The run gets each conversation in the chosen inbox view when it starts or gets a new message.",
  action: conversationList as unknown as ActionDefinition,
  params: [
    {
      key: "filter",
      label: "Conversations",
      type: "select",
      required: true,
      default: "open",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "unread", label: "Unread" },
        { value: "outbound", label: "Outbound" },
      ],
    },
  ],
  input: (params: { filter?: string }) => ({ filter: params.filter || "open", limit: 50 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const c = item as { id?: unknown; last_message_at?: unknown };
    return c.id === undefined ? "" : `${c.id}:${c.last_message_at ?? ""}`;
  },
  output: [
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "contact_id", type: "number", label: "Contact ID" },
    { key: "inbox_id", type: "number", label: "Inbox (team) ID" },
    { key: "last_message_at", type: "string", label: "Last message at" },
    { key: "started_at", type: "string", label: "Started at" },
  ],
  sample: {
    id: 4101,
    contact_id: 2201,
    inbox_id: 31,
    last_message_at: "2026-11-10T09:00:00Z",
    started_at: "2026-11-09T09:00:00Z",
  },
  maxPages: 1,
});

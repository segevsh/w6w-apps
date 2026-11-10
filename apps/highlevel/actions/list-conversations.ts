import type { ActionDefinition } from "@w6w/types";
import { CALENDAR_API_VERSION, HighLevelClient } from "../lib/client.ts";

interface Input {
  contactId?: string;
  status?: "all" | "read" | "unread" | "starred" | "recents";
  query?: string;
  sort?: "asc" | "desc";
  sortBy?: "last_message_date" | "last_manual_message_date";
  limit?: number;
}

const listConversations: ActionDefinition<Input> = {
  key: "list-conversations",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description: "Search conversations in the connected location.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All" },
        { value: "read", label: "Read" },
        { value: "unread", label: "Unread" },
        { value: "starred", label: "Starred" },
        { value: "recents", label: "Recent" },
      ],
    },
    { key: "query", label: "Search", type: "string" },
    {
      key: "sort",
      label: "Sort direction",
      type: "select",
      hint: "Leave empty for HighLevel's own order. `desc` lists the most recently active first.",
      options: [
        { value: "desc", label: "Newest activity first" },
        { value: "asc", label: "Oldest activity first" },
      ],
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "last_message_date", label: "Last message (any)" },
        { value: "last_manual_message_date", label: "Last manual message" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 20 },
  ],
  output: [{ key: "conversations", type: "array", label: "Conversations" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/conversations/search", {
      version: CALENDAR_API_VERSION,
      query: {
        locationId: client.locationId,
        contactId: input.contactId,
        status: input.status ?? "all",
        query: input.query,
        sort: input.sort,
        sortBy: input.sortBy,
        limit: input.limit ?? 20,
      },
    });
  },
};

export default listConversations;

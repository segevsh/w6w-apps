import type { ActionDefinition } from "@w6w/types";
import { type ListResponse, MessengerClient, pageSegment } from "../lib/client.ts";

interface Input {
  userId?: string;
  limit?: number;
  cursor?: string;
  pageId?: string;
}

interface ConversationSummary {
  id: string;
  updated_time?: string | number;
}

/**
 * List the Page's Messenger conversations — `GET /{page}/conversations?platform=messenger`.
 * With `userId` (a PSID) it finds the conversation with that one person.
 *
 * Conversations in the Requests folder that have been inactive for 30 days are not
 * returned, and reading conversations with people who hold no role on the app needs
 * Advanced Access.
 */
const listConversations: ActionDefinition<Input, ListResponse<ConversationSummary>> = {
  key: "list-conversations",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description: "List the Page's Messenger conversations, or find the one with a specific person.",
  params: [
    {
      key: "userId",
      label: "Person (PSID)",
      type: "string",
      hint: "Only return the conversation with this Page-scoped ID.",
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "`paging.cursors.after` from the previous page.",
    },
    { key: "pageId", label: "Page ID", type: "string", hint: "Defaults to `me`." },
  ],
  output: [
    { key: "data", type: "array", label: "Conversations" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    return new MessengerClient(ctx).request<ListResponse<ConversationSummary>>(
      `/${pageSegment(input.pageId)}/conversations`,
      {
        query: {
          platform: "messenger",
          user_id: input.userId,
          limit: input.limit ?? 25,
          after: input.cursor,
        },
      },
    );
  },
};

export default listConversations;

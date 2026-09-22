import type { ActionDefinition } from "@w6w/types";
import { asNumber, HostawayClient, segment } from "../lib/client.ts";

/**
 * List a conversation's messages. Wraps
 * `GET /v1/conversations/{conversationId}/messages`.
 *
 * Documented query parameters, verbatim: `limit`, `offset`, and
 * `includeScheduledMessages` — "Return messages of all the statuses or not".
 *
 * The response note is the useful one:
 *
 *   "Array of conversation message objects. By default the server returns messages in
 *   the status `sent`. If you want to get all messages (failed, awaiting, etc.) you
 *   should use includeScheduledMessages parameter."
 *
 * The docs' own example is
 * `.../messages?limit=&offset=includeScheduledMessages=1` (a typo in the vendor's page —
 * the parameter is a normal one, not glued onto `offset`).
 */
const action: ActionDefinition = {
  key: "list-conversation-messages",
  type: "search",
  resource: "conversation",
  title: "List conversation messages",
  description: "List the messages in one conversation, newest state included.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    { key: "limit", label: "Limit", type: "number" },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "includeScheduledMessages",
      label: "Include all statuses",
      type: "boolean",
      hint: "Without this only `sent` messages are returned.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Messages" },
    { key: "count", type: "number", label: "Total matching messages" },
    { key: "page", type: "number", label: "Page number" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = asNumber(p.conversationId);
    if (conversationId === undefined) throw new Error("`conversationId` is required");
    return await new HostawayClient(ctx).requestPage(
      `/conversations/${segment(conversationId)}/messages`,
      {
        query: {
          limit: asNumber(p.limit),
          offset: asNumber(p.offset),
          includeScheduledMessages: asNumber(p.includeScheduledMessages),
        },
      },
    );
  },
};

export default action;

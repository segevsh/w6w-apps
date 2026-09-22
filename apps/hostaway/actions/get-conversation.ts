import type { ActionDefinition } from "@w6w/types";
import { asNumber, HostawayClient, segment } from "../lib/client.ts";

/**
 * Read one conversation in full. Wraps `GET /v1/conversations/{conversationId}`.
 *
 * Documented query parameter: `includeResources` — "if includeResources flag is 1 then
 * response object is supplied with supplementary resources, default is 0."
 *
 * Response: "A conversation object." — the documented Conversation object carries
 * `accountId`, `listingMapId`, `reservationId`, `type` (e.g. `host-guest-email`),
 * `recipientEmail`, `recipientName`, `hostEmail`, `guestEmail`, `hasUnreadMessages`,
 * `messageSentOn`, `messageReceivedOn` and an embedded `conversationMessages` array.
 *
 * For a full, paginated message history prefer `list-conversation-messages`.
 */
const action: ActionDefinition = {
  key: "get-conversation",
  type: "read",
  resource: "conversation",
  title: "Get a conversation",
  description: "Show one guest conversation.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "includeResources",
      label: "Include resources",
      type: "boolean",
      hint: "Return supplementary resources instead of the empty arrays they default to.",
    },
  ],
  output: [
    { key: "accountId", type: "number", label: "Account ID" },
    { key: "listingMapId", type: "number", label: "Listing ID" },
    { key: "reservationId", type: "number", label: "Reservation ID" },
    { key: "type", type: "string", label: "Conversation type" },
    { key: "recipientName", type: "string", label: "Recipient name" },
    { key: "recipientEmail", type: "string", label: "Recipient email" },
    { key: "hasUnreadMessages", type: "number", label: "Has unread messages" },
    { key: "conversationMessages", type: "array", label: "Messages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = asNumber(p.conversationId);
    if (conversationId === undefined) throw new Error("`conversationId` is required");
    return await new HostawayClient(ctx).request(
      `/conversations/${segment(conversationId)}`,
      { query: { includeResources: asNumber(p.includeResources) } },
    );
  },
};

export default action;

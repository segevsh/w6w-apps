import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { messageIdParam } from "../lib/params.ts";

/**
 * `GET /api/messages/{messageId}` — "Get a Message".
 *
 * One `Message` by its hexadecimal ID: the same shape as a row of
 * `message-list`, without the page envelope. It is the endpoint to use when a
 * workflow already holds a message ID — the `id` from `message-send`, or an ID
 * carried by a webhook payload the vendor POSTs to your own URL (webhooks are
 * this app's `webhook-*` actions; the payload itself arrives at your endpoint,
 * not here).
 *
 * The ID goes in the path, so it is escaped as a single segment: an ID pasted
 * with a slash or a query character in it fails as a 404 instead of silently
 * addressing a different path.
 */
interface Input {
  messageId: string;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Read one message by its hexadecimal ID.",
  params: [messageIdParam],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "subject", type: "string", label: "Subject (MMS)" },
    { key: "contactPhone", type: "string", label: "Contact phone" },
    { key: "accountPhone", type: "string", label: "Account phone" },
    { key: "directionType", type: "string", label: "MT (sent) or MO (received)" },
    { key: "category", type: "string", label: "SMS, MMS or EXTENDED_SMS" },
    { key: "timestamp", type: "string", label: "Sent/received at (ISO 8601)" },
    { key: "referenceType", type: "string", label: "Reference type (MT messages)" },
    { key: "mediaItems", type: "array", label: "Attached media item IDs" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).json(
      `/api/messages/${encodePathSegment(input.messageId)}`,
    );
  },
};

export default messageGet;

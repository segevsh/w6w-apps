import type { ActionDefinition } from "@w6w/types";
import { asText, HostawayClient, segment } from "../lib/client.ts";

/**
 * Send a message in a guest conversation. Wraps
 * `POST /v1/conversations/{conversationId}/messages`.
 *
 * **RATE LIMIT: 30 requests per minute, per account.** Hostaway documents this endpoint
 * as one of the few with its own counter — "An endpoint that has its own limit does not
 * use the general limit. A call to Send conversation message counts against the 30 per
 * minute counter only." The window is sliding, not a fixed clock boundary, and a 429
 * carries `X-RateLimit-Retry-After` as a Unix timestamp to retry AT (not a delay).
 *
 * Documented body, verbatim:
 *
 *   "A conversation message object should be provided in the request body. We do not
 *   support sending attachments in the message. The `body` only parameter can be
 *   specified. By default `communicationType` parameter is `email`, possible options:
 *   email / channel / sms / whatsapp."
 *
 * So the request body is `{ body, communicationType? }` — nothing else, and no
 * attachments. Response: "The created conversation message object or error response."
 */
const action: ActionDefinition = {
  key: "send-conversation-message",
  type: "perform",
  resource: "conversation",
  title: "Send a conversation message",
  description: "Send a message in a guest conversation. Hostaway rate-limits this endpoint " +
    "to 30 requests per minute per account.",
  // Each call sends a new message to the guest; retrying a failed call sends it again.
  idempotent: false,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "body",
      label: "Message",
      type: "text",
      required: true,
      hint: "Attachments are not supported by this endpoint.",
    },
    {
      key: "communicationType",
      label: "Communication type",
      type: "select",
      options: [
        { value: "email", label: "Email (default)" },
        { value: "channel", label: "Channel" },
        { value: "sms", label: "SMS" },
        { value: "whatsapp", label: "WhatsApp" },
      ],
      hint: "Defaults to email when omitted.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "conversationId", type: "number", label: "Conversation ID" },
    { key: "body", type: "string", label: "Body" },
    { key: "communicationType", type: "string", label: "Communication type" },
    { key: "status", type: "string", label: "Status" },
    { key: "isIncoming", type: "number", label: "Incoming (0/1)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "").trim();
    if (!conversationId) throw new Error("`conversationId` is required");
    const body = asText(p.body);
    if (!body) throw new Error("`body` is required");
    const communicationType = asText(p.communicationType) ?? "email";

    return await new HostawayClient(ctx).request(
      `/conversations/${segment(conversationId)}/messages`,
      { method: "POST", body: { body, communicationType } },
    );
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * `GET /messages/outbound/{messageid}/details` — full details for one
 * outbound message, including body content and delivery events.
 * https://postmarkapp.com/developer/api/messages-api#outbound-message-details
 */
const getOutboundMessage: ActionDefinition<Input> = {
  key: "get-outbound-message",
  type: "read",
  resource: "message",
  title: "Get Outbound Message",
  description: "Get full details (body, status, delivery events) for one outbound message by ID.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],
  output: [
    { key: "MessageID", type: "string", label: "Message ID" },
    { key: "Subject", type: "string", label: "Subject" },
    { key: "Status", type: "string", label: "Status" },
    { key: "From", type: "string", label: "From" },
    { key: "To", type: "array", label: "To" },
    { key: "ReceivedAt", type: "string", label: "Received At" },
    { key: "MessageEvents", type: "array", label: "Message Events" },
  ],

  async execute(input, ctx) {
    if (!input.messageId) throw new Error("get-outbound-message requires `messageId`");
    return await postmarkFetch(
      ctx,
      `/messages/outbound/${encodeURIComponent(input.messageId)}/details`,
    );
  },
};

export default getOutboundMessage;

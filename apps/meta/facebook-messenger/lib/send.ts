import type { OutputField, Param } from "@w6w/types";
import { MessengerClient, pageSegment, requireString } from "./client.ts";

/** Fields every Send API action shares. */
export interface SendInput {
  recipientId: string;
  messagingType?: string;
  tag?: string;
  replyToMessageId?: string;
  pageId?: string;
}

export interface SendResponse {
  recipient_id: string;
  message_id: string;
  attachment_id?: string;
}

export const recipientParam: Param = {
  key: "recipientId",
  label: "Recipient (PSID)",
  type: "string",
  required: true,
  hint:
    "Page-scoped ID of the person. Obtained from a messages webhook or the Conversations API. App-scoped Facebook Login IDs do not work.",
};

export const sendOptionParams: Param[] = [
  {
    key: "messagingType",
    label: "Messaging type",
    type: "string",
    default: "RESPONSE",
    hint:
      "RESPONSE (reply inside the standard messaging window), UPDATE (proactive, inside the window) or MESSAGE_TAG (outside the window — requires a tag).",
  },
  {
    key: "tag",
    label: "Message tag",
    type: "string",
    hint:
      "Required with MESSAGE_TAG, e.g. HUMAN_AGENT (a 7-day window for a person replying manually). Meta rejects CONFIRMED_EVENT_UPDATE, ACCOUNT_UPDATE and POST_PURCHASE_UPDATE with error 100 since 2026-04-27.",
  },
  {
    key: "replyToMessageId",
    label: "Reply to message ID",
    type: "string",
    hint: "Message ID (mid) of an earlier message in the chat to reply to.",
  },
  {
    key: "pageId",
    label: "Page ID",
    type: "string",
    hint: "Defaults to `me`, which a Page access token resolves to its own Page.",
  },
];

/**
 * POST /{page}/messages with the envelope the Send API documents:
 * `{ recipient: { id }, messaging_type, tag?, message, reply_to?: { mid } }`.
 */
export function sendMessage(
  client: MessengerClient,
  input: SendInput,
  message: Record<string, unknown>,
): Promise<SendResponse> {
  const body: Record<string, unknown> = {
    recipient: { id: requireString("recipientId", input.recipientId) },
    messaging_type: input.messagingType?.trim() || "RESPONSE",
    message,
  };
  if (input.tag) body.tag = input.tag;
  if (input.replyToMessageId) body.reply_to = { mid: input.replyToMessageId };
  return client.request<SendResponse>(`/${pageSegment(input.pageId)}/messages`, {
    method: "POST",
    body,
  });
}

export const sendOutput: OutputField[] = [
  { key: "recipient_id", type: "string", label: "Recipient ID" },
  { key: "message_id", type: "string", label: "Message ID" },
];

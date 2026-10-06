import type { ActionDefinition } from "@w6w/types";
import { compact, KudosityClient } from "../lib/client.ts";

/** `POST /v2/sms` — send one SMS. Answers 200 with the created message. */
interface Input {
  sender: string;
  recipient: string;
  message: string;
  messageRef?: string;
  trackLinks?: boolean;
}

const smsSend: ActionDefinition<Input> = {
  key: "sms-send",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description: "Send an SMS from a sender number or alphanumeric ID to one recipient.",
  idempotent: false,
  params: [
    {
      key: "sender",
      label: "Sender",
      type: "string",
      required: true,
      hint: "A sender number assigned to your account for the destination country, or an " +
        "alphanumeric ID of up to 11 characters (letters, digits, underscore, hyphen, space).",
    },
    {
      key: "recipient",
      label: "Recipient",
      type: "string",
      required: true,
      hint: "E.164 without the plus, e.g. 61438333061, or local format in the sender's country.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      hint: "Split into 160-character parts (153 when multipart); 70/67 with Unicode or emoji. " +
        "Insert [opt-out-link] to have an opt-out link generated.",
    },
    {
      key: "messageRef",
      label: "Message reference",
      type: "string",
      hint: "Your own reference (max 500 chars), echoed back in webhooks.",
      validation: { maxLength: 500 },
    },
    {
      key: "trackLinks",
      label: "Track links",
      type: "boolean",
      hint: "Replace links with shortened, tracked links (produces LINK_HIT webhook events).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "sender", type: "string", label: "Sender" },
    { key: "sms_count", type: "string", label: "SMS parts" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    return await new KudosityClient(ctx).json("/sms", {
      method: "POST",
      body: compact({
        sender: input.sender,
        recipient: input.recipient,
        message: input.message,
        message_ref: input.messageRef,
        track_links: input.trackLinks,
      }),
    });
  },
};

export default smsSend;

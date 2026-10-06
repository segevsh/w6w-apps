import type { ActionDefinition } from "@w6w/types";
import { compact, KudosityClient } from "../lib/client.ts";

/** `POST /v2/mms` — send one MMS with one or more media URLs. */
interface Input {
  sender: string;
  recipient: string;
  contentUrls: string[];
  subject?: string;
  message?: string;
  messageRef?: string;
  trackLinks?: boolean;
}

const mmsSend: ActionDefinition<Input> = {
  key: "mms-send",
  type: "perform",
  resource: "mms",
  title: "Send MMS",
  description: "Send a multimedia message with media attachments to one recipient.",
  idempotent: false,
  params: [
    { key: "sender", label: "Sender", type: "string", required: true },
    {
      key: "recipient",
      label: "Recipient",
      type: "string",
      required: true,
      hint: "E.164 without the plus, e.g. 61438333061.",
    },
    {
      key: "contentUrls",
      label: "Content URLs",
      type: "json",
      required: true,
      hint: 'JSON array of publicly reachable media URLs, e.g. ["https://example.com/a.jpg"].',
    },
    { key: "subject", label: "Subject", type: "string" },
    { key: "message", label: "Message", type: "text" },
    {
      key: "messageRef",
      label: "Message reference",
      type: "string",
      hint: "Your own reference, echoed back in webhooks.",
    },
    { key: "trackLinks", label: "Track links", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "sender", type: "string", label: "Sender" },
    { key: "content_urls", type: "array", label: "Content URLs" },
  ],

  async execute(input, ctx) {
    const urls = typeof input.contentUrls === "string"
      ? JSON.parse(input.contentUrls) as string[]
      : input.contentUrls;
    return await new KudosityClient(ctx).json("/mms", {
      method: "POST",
      body: compact({
        sender: input.sender,
        recipient: input.recipient,
        content_urls: urls,
        subject: input.subject,
        message: input.message,
        message_ref: input.messageRef,
        track_links: input.trackLinks,
      }),
    });
  },
};

export default mmsSend;

import type { ActionDefinition } from "@w6w/types";
import { compact, KudosityClient } from "../lib/client.ts";

/**
 * `POST /v2/rcs/messages` (beta) — one RCS message from a registered agent. `content_type` is
 * `text` (up to 3072 chars) or `media` (one https image/video URL, no caption).
 */
interface Input {
  sender: string;
  recipient: string;
  contentType: "text" | "media";
  text?: string;
  mediaUrl?: string;
  smsFallbackMessage?: string;
  smsFallbackSender?: string;
  messageRef?: string;
}

export function buildContent(input: Input): Record<string, unknown> {
  if (input.contentType === "text") {
    if (!input.text) throw new Error("`text` is required when content type is text");
    return { text: { message: input.text } };
  }
  if (input.contentType === "media") {
    if (!input.mediaUrl) throw new Error("`mediaUrl` is required when content type is media");
    return { media: { url: input.mediaUrl } };
  }
  throw new Error(`unsupported content type: ${String(input.contentType)}`);
}

const rcsSend: ActionDefinition<Input> = {
  key: "rcs-send",
  type: "perform",
  resource: "rcs",
  title: "Send RCS Message",
  description: "Send an RCS text or media message through a registered RCS agent, with an " +
    "optional SMS fallback. The vendor flags this endpoint as beta.",
  idempotent: false,
  params: [
    {
      key: "sender",
      label: "RCS agent ID",
      type: "string",
      required: true,
      hint: "The registered agent identifier, e.g. DemoSender. RCS does not use a phone number.",
    },
    {
      key: "recipient",
      label: "Recipient",
      type: "string",
      required: true,
      hint: "E.164 without the plus, e.g. 447903749662.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "select",
      required: true,
      default: "text",
      options: [{ value: "text", label: "Text" }, { value: "media", label: "Media" }],
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      hint: "Up to 3072 characters.",
      validation: { maxLength: 3072 },
      showIf: { "==": [{ var: "contentType" }, "text"] },
    },
    {
      key: "mediaUrl",
      label: "Media URL",
      type: "string",
      hint:
        "Public https URL (port 443, no redirects, no credentials) of a JPEG/PNG/GIF image or " +
        "an MP4/MPEG/WebM video up to 100 MB. Media cannot carry a caption.",
      showIf: { "==": [{ var: "contentType" }, "media"] },
    },
    {
      key: "smsFallbackMessage",
      label: "SMS fallback message",
      type: "text",
      hint: "Sent as SMS if the RCS message fails or the device is not RCS capable.",
    },
    { key: "smsFallbackSender", label: "SMS fallback sender", type: "string" },
    {
      key: "messageRef",
      label: "Message reference",
      type: "string",
      hint: "Your own reference (max 500 chars), echoed back in webhooks.",
      validation: { maxLength: 500 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "sender", type: "string", label: "Sender (RCS agent)" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const { data } = await new KudosityClient(ctx).data("/rcs/messages", {
      method: "POST",
      body: compact({
        sender: input.sender,
        recipient: input.recipient,
        content_type: input.contentType,
        content: buildContent(input),
        sms_fallback: input.smsFallbackMessage
          ? compact({ sender: input.smsFallbackSender, message: input.smsFallbackMessage })
          : undefined,
        message_ref: input.messageRef,
      }),
    });
    return data as Record<string, unknown>;
  },
};

export default rcsSend;

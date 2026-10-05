import type { ActionDefinition } from "@w6w/types";
import { asStringArray, encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `POST /messages/{conversation}` — "Send SMS by conversation" (scope `messages:write`). Same
 * shape as `message-send`, addressed by conversation instead of number and team. Not idempotent.
 */
interface Input {
  conversation: number;
  message: string;
  send_at?: string;
  media_urls?: string[] | string;
  enable_quiet_hours?: boolean;
}

const messageSendToConversation: ActionDefinition<Input> = {
  key: "message-send-to-conversation",
  type: "perform",
  resource: "message",
  title: "Send Message to Conversation",
  description: "Send an SMS or MMS into an existing conversation.",
  idempotent: false,
  params: [
    {
      key: "conversation",
      label: "Conversation ID",
      type: "number",
      required: true,
      hint: "The conversation ID.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      hint: "The message body.",
    },
    {
      key: "send_at",
      label: "Send at",
      type: "datetime",
      hint: "Schedule the message for this time (ISO 8601).",
    },
    {
      key: "media_urls",
      label: "Media URLs",
      type: "string",
      hint: "Public URLs of media to attach (MMS). Comma-separated.",
    },
    {
      key: "enable_quiet_hours",
      label: "Respect quiet hours",
      type: "boolean",
      hint: "Apply the organization's quiet-hours check.",
    },
  ],
  output: [{ key: "response", type: "object", label: "The queued message" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(`/messages/${encodePathSegment(input.conversation)}`, {
      method: "POST",
      query: {
        message: input.message,
        send_at: input.send_at,
        "media_url[][url]": asStringArray(input.media_urls),
        enable_quiet_hours: input.enable_quiet_hours,
      },
    });
  },
};

export default messageSendToConversation;

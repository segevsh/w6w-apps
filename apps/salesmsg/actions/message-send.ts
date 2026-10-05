import type { ActionDefinition } from "@w6w/types";
import { asStringArray, SalesmsgClient } from "../lib/client.ts";

/**
 * `POST /messages` — "Send SMS by number" (scope `messages:write`). Fields are **query
 * parameters**; `media_url[][url]` is repeated once per URL. No idempotency key is declared, and a
 * retry texts a real person again, so the action is `idempotent: false`.
 */
interface Input {
  number: string;
  team_id: number;
  message: string;
  send_at?: string;
  media_urls?: string[] | string;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send an SMS or MMS to a phone number from one of your inboxes.",
  idempotent: false,
  params: [
    {
      key: "number",
      label: "To number",
      type: "string",
      required: true,
      hint: "The recipient's number, ideally E.164 (+15551234567).",
    },
    {
      key: "team_id",
      label: "Team ID",
      type: "number",
      required: true,
      hint: "The inbox to send from, from List Inboxes.",
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
  ],
  output: [{
    key: "response",
    type: "object",
    label: "The queued message (id, conversation_id, status, body, ...)",
  }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json("/messages", {
      method: "POST",
      query: {
        number: input.number,
        team_id: input.team_id,
        message: input.message,
        send_at: input.send_at,
        "media_url[][url]": asStringArray(input.media_urls),
      },
    });
  },
};

export default messageSend;

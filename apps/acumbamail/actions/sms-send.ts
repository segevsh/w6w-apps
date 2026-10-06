import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField } from "../lib/client.ts";

interface Input {
  messages: unknown;
}

/** `POST /api/1/sendSMS/` */
const smsSend: ActionDefinition<Input> = {
  key: "sms-send",
  type: "perform",
  title: "Send SMS",
  description:
    "Send one or more SMS messages in one call. Returns per-message status in send order. Not safe to retry.",
  idempotent: false,
  params: [
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: 'Array of {"recipient": "+34...", "body": "...", "sender": "..."}.',
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "sendSMS", {
      messages: JSON.stringify(parseJsonField("messages", input.messages)),
    });
    return { result };
  },
};

export default smsSend;

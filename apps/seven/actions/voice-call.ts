import type { ActionDefinition } from "@w6w/types";
import { SevenClient, toList } from "../lib/client.ts";

/** `POST /api/voice` — text-to-speech call. The deprecated `xml` flag is not offered. */
interface Input {
  to: string | string[];
  text: string;
  from?: string;
  ringtime?: number;
  foreign_id?: string;
}

const voiceCall: ActionDefinition<Input> = {
  key: "voice-call",
  type: "perform",
  resource: "voice",
  title: "Send Voice Call",
  description:
    "Place a text-to-speech call to one or more numbers. The text may be plain or SSML; a separate call and a `messages` entry is created per recipient.",
  idempotent: false,
  params: [
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Phone number(s) in international format, comma-separated, or a contact or group name.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "Plain text, or SSML wrapped in a <voice> tag.",
    },
    {
      key: "from",
      label: "Caller ID",
      type: "string",
      hint: "A verified sender ID or a number booked with seven.",
    },
    {
      key: "ringtime",
      label: "Ring time (seconds)",
      type: "number",
      hint: "5 to 60; vendor default 30.",
      validation: { integer: true, min: 5, max: 60 },
    },
    {
      key: "foreign_id",
      label: "Your own ID",
      type: "string",
      hint: "Passed back in webhook events.",
    },
  ],
  output: [
    { key: "success", type: "string", label: "Return code (100 accepted)" },
    { key: "total_price", type: "number", label: "Total price" },
    { key: "balance", type: "number", label: "Balance after the call" },
    { key: "messages", type: "array", label: "One entry per recipient, with the call id" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("POST", "/voice", {
      form: {
        to: toList(input.to),
        text: input.text,
        from: input.from,
        ringtime: input.ringtime,
        foreign_id: input.foreign_id,
      },
    });
  },
};

export default voiceCall;

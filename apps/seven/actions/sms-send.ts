import type { ActionDefinition } from "@w6w/types";
import { SevenClient, toList } from "../lib/client.ts";

/**
 * `POST /api/sms` — send an SMS. Verified against docs.seven.io/en/rest-api/endpoints/sms.
 * `success` is a return code: `100` accepted, `101` at least one recipient failed (per-recipient
 * errors in `messages`), anything else is thrown. The deprecated parameters (`unicode`, `utf8`,
 * `json`, `details`, `return_msg_id`, `no_reload`) are not offered. File attachments are not
 * covered.
 */
interface Input {
  to: string | string[];
  text: string;
  from?: string;
  delay?: string;
  flash?: boolean;
  udh?: string;
  ttl?: number;
  label?: string;
  performance_tracking?: boolean;
  foreign_id?: string;
  is_binary?: boolean;
  get_replies?: boolean;
}

const smsSend: ActionDefinition<Input> = {
  key: "sms-send",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description:
    "Send an SMS to one or more numbers, contacts or groups, now or at a scheduled time. Code 101 (partial failure) is returned, not thrown: check each message's success flag.",
  idempotent: false,
  params: [
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint:
        "Phone number(s) in international format, comma-separated, or the name of a contact or group.",
    },
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "from",
      label: "Sender",
      type: "string",
      hint: "Up to 11 alphanumeric or 16 numeric characters.",
      validation: { maxLength: 16 },
    },
    {
      key: "delay",
      label: "Send at",
      type: "string",
      hint: "Unix timestamp or `YYYY-MM-DD hh:mm:ss`. Omit to send now.",
    },
    { key: "flash", label: "Flash SMS", type: "boolean" },
    {
      key: "udh",
      label: "UDH",
      type: "string",
      hint: "User Data Header in hex. With hex text, the message goes out as an 8-bit binary SMS.",
    },
    {
      key: "ttl",
      label: "Validity (minutes)",
      type: "number",
      hint: "Vendor default 2880 (48 hours); not every network honours it.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "label",
      label: "Label",
      type: "string",
      hint: "Statistics label, max 100 characters of a-z A-Z 0-9 . - _ @",
      validation: { maxLength: 100 },
    },
    {
      key: "performance_tracking",
      label: "Click tracking",
      type: "boolean",
      hint:
        "Tracks URLs in the text. Needs a custom domain under Settings > Conversion Tracking, otherwise code 603.",
    },
    {
      key: "foreign_id",
      label: "Your own ID",
      type: "string",
      hint: "Echoed back in status-report callbacks. Max 64 characters of a-z A-Z 0-9 . - _ @",
      validation: { maxLength: 64 },
    },
    { key: "is_binary", label: "Binary", type: "boolean" },
    {
      key: "get_replies",
      label: "Enable replies",
      type: "boolean",
      hint: "Replies are assigned for 48 hours; the sender is overwritten.",
    },
  ],
  output: [
    { key: "success", type: "string", label: "Return code (100 accepted, 101 partial failure)" },
    { key: "total_price", type: "number", label: "Total price" },
    { key: "balance", type: "number", label: "Balance after sending" },
    { key: "sms_type", type: "string", label: "direct or scheduled" },
    { key: "messages", type: "array", label: "One entry per recipient, with id, price and error" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("POST", "/sms", {
      allowCodes: ["100", "101"],
      form: {
        to: toList(input.to),
        text: input.text,
        from: input.from,
        delay: input.delay,
        flash: input.flash,
        udh: input.udh,
        ttl: input.ttl,
        label: input.label,
        performance_tracking: input.performance_tracking,
        foreign_id: input.foreign_id,
        is_binary: input.is_binary,
        get_replies: input.get_replies,
      },
    });
  },
};

export default smsSend;

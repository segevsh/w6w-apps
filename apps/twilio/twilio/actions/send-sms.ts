import type { ActionDefinition } from "@w6w/types";
import { TwilioClient } from "../lib/client.ts";

interface Input {
  from?: string;
  messagingServiceSid?: string;
  to: string;
  message: string;
  toWhatsapp?: boolean;
  mediaUrls?: string[];
  contentSid?: string;
  contentVariables?: unknown;
  sendAt?: string;
  validityPeriod?: number;
  statusCallback?: string;
}

/**
 * Send an SMS/MMS/WhatsApp message via Twilio's `Messages` REST resource.
 * When `toWhatsapp` is true, both `From` and `To` are prefixed with `whatsapp:`
 * so Twilio routes the payload through WhatsApp instead of SMS.
 *
 * **Sender.** Twilio takes exactly one of `From` (a number you own) or
 * `MessagingServiceSid` (a Messaging Service, which owns a sender pool and is
 * what US A2P 10DLC registration attaches to). `From` used to be `required`
 * here, which made the Messaging Service path unreachable — so neither is
 * required now and `execute` enforces the either/or, with the message Twilio's
 * own 400 does not give you.
 *
 * **MMS.** The title has always said "SMS, MMS, or WhatsApp", but there was no
 * way to attach anything, so MMS was undeliverable. `mediaUrls` encodes as
 * repeated `MediaUrl` parameters — Twilio's multi-value convention, and the
 * reason `RequestOptions.form` grew an array arm.
 */
const sendSms: ActionDefinition<Input> = {
  key: "send-sms",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description: "Send an SMS, MMS, or WhatsApp message.",
  params: [
    {
      key: "sender",
      label: "Sender",
      type: "section",
      section: "group",
      layout: "row",
      children: [
        {
          key: "from",
          label: "From",
          type: "string",
          hint:
            "Sender phone number in E.164 format, e.g. +14155238886. Leave empty when using a Messaging Service.",
        },
        {
          key: "messagingServiceSid",
          label: "Messaging Service SID",
          type: "string",
          placeholder: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          hint:
            "Send from a Messaging Service's sender pool instead of one number. Required for scheduled sends, and what US A2P 10DLC registration attaches to.",
        },
      ],
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Recipient phone number in E.164 format.",
    },
    { key: "message", label: "Message", type: "text", required: true },
    {
      // A routing switch, not an option: it changes what From and To mean.
      key: "toWhatsapp",
      label: "Send to WhatsApp",
      type: "boolean",
      default: false,
      hint: "Prefix both numbers with `whatsapp:` to route via WhatsApp.",
    },
    {
      key: "sendOptions",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "Media, templates, scheduling, status callback",
      collapsed: true,
      children: [
        {
          key: "mediaUrls",
          label: "Media URLs",
          type: "array",
          item: { type: "string", placeholder: "https://example.com/image.jpg" },
          hint:
            "Publicly reachable URLs to attach — this is what makes the message an MMS. Twilio fetches each one itself, so they must not need auth. Up to 10.",
        },
        {
          key: "contentSid",
          label: "Content SID",
          type: "string",
          placeholder: "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          hint:
            "An approved Content Template. WhatsApp requires one to open a conversation outside the 24-hour customer service window — without it that send is rejected.",
        },
        {
          key: "contentVariables",
          label: "Content variables",
          type: "json",
          hint: 'Values for the template placeholders, e.g. { "1": "Alice", "2": "3pm" }',
        },
        {
          key: "sendAt",
          label: "Send at",
          type: "datetime",
          hint:
            "Schedule delivery. Twilio requires a Messaging Service for this, and the time must be 15 minutes to 7 days out.",
        },
        {
          key: "validityPeriod",
          label: "Validity period (seconds)",
          type: "number",
          hint:
            "Drop the message if it has not been delivered within this many seconds — for codes and alerts that go stale. 1–36000.",
        },
        {
          key: "statusCallback",
          label: "Status Callback URL",
          type: "string",
          hint: "URL Twilio will POST message status updates to.",
        },
      ],
    },
  ],

  execute(input, ctx) {
    const client = new TwilioClient(ctx);
    const hasFrom = !!input.from?.trim();
    const hasService = !!input.messagingServiceSid?.trim();
    if (hasFrom === hasService) {
      throw new Error(
        hasFrom
          ? "Set either `from` or `messagingServiceSid`, not both — Twilio rejects a message carrying both senders."
          : "A sender is required: set `from` (a number you own) or `messagingServiceSid` (a Messaging Service).",
      );
    }
    // Scheduling is a Messaging Service feature; Twilio answers a bare 400 when
    // it is missing, which reads as an unrelated failure.
    if (input.sendAt && !hasService) {
      throw new Error(
        "Scheduling a message requires `messagingServiceSid` — Twilio only schedules sends made through a Messaging Service.",
      );
    }

    const wrap = (n: string) => (input.toWhatsapp ? `whatsapp:${n}` : n);
    const media = (input.mediaUrls ?? []).map((u) => String(u).trim()).filter(Boolean);

    return client.request(client.accountPath("/Messages.json"), {
      method: "POST",
      form: {
        From: hasFrom ? wrap(input.from!.trim()) : undefined,
        MessagingServiceSid: hasService ? input.messagingServiceSid!.trim() : undefined,
        To: wrap(input.to),
        Body: input.message,
        MediaUrl: media.length ? media : undefined,
        ContentSid: input.contentSid,
        ContentVariables: input.contentVariables === undefined
          ? undefined
          : typeof input.contentVariables === "string"
          ? input.contentVariables
          : JSON.stringify(input.contentVariables),
        // Twilio's only schedule type; sending SendAt without it is a 400.
        ScheduleType: input.sendAt ? "fixed" : undefined,
        SendAt: input.sendAt ? new Date(input.sendAt).toISOString() : undefined,
        ValidityPeriod: input.validityPeriod,
        StatusCallback: input.statusCallback,
      },
    });
  },
};

export default sendSms;

import type { ActionDefinition } from "@w6w/types";
import { joinDestinations, PlivoClient } from "../lib/client.ts";

interface Input {
  from?: string;
  powerpackUuid?: string;
  to: string | string[];
  text?: string;
  type?: "sms" | "mms" | "whatsapp";
  mediaUrls?: string[];
  callbackUrl?: string;
  callbackMethod?: "GET" | "POST";
  messageExpiry?: number;
  log?: "true" | "false" | "content_only" | "number_only";
  trackable?: boolean;
}

/**
 * `POST /v1/Account/{auth_id}/Message/` — JSON body (`src`, `dst`, `text`, …).
 * Several recipients go in one `dst` joined by `<`; the response then carries
 * one `message_uuid` per recipient. The India DLT fields are deprecated by
 * Plivo and deliberately not exposed.
 */
const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send an SMS or MMS message (or several, one per recipient).",
  idempotent: false,
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      hint:
        "Sender: a Plivo number, short code or alphanumeric sender ID. Leave empty when using a Powerpack.",
    },
    {
      key: "powerpackUuid",
      label: "Powerpack UUID",
      type: "string",
      hint: "Send through a Powerpack's number pool instead of a single sender.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Recipient in E.164 format. Separate several with `<`, e.g. 14156667777<14157778888.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      hint: "Message body (1,600 GSM / 737 Unicode chars).",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "sms",
      options: [
        { value: "sms", label: "SMS" },
        { value: "mms", label: "MMS" },
        { value: "whatsapp", label: "WhatsApp" },
      ],
    },
    {
      key: "mediaUrls",
      label: "Media URLs",
      type: "array",
      item: { type: "string", placeholder: "https://example.com/image.jpg" },
      hint: "MMS only: up to 10 publicly reachable URLs, under 5 MB in total.",
    },
    {
      key: "options",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "Delivery callback, expiry, logging",
      collapsed: true,
      children: [
        {
          key: "callbackUrl",
          label: "Delivery status callback URL",
          type: "string",
          hint: "Plivo notifies this URL as the message status changes.",
        },
        {
          key: "callbackMethod",
          label: "Callback method",
          type: "select",
          options: [{ value: "POST", label: "POST" }, { value: "GET", label: "GET" }],
        },
        {
          key: "messageExpiry",
          label: "Message expiry (seconds)",
          type: "number",
          hint:
            "Drop the message if undelivered after this long. 5–10,799; Plivo's default is 10,800.",
        },
        {
          key: "log",
          label: "Data logging",
          type: "select",
          options: [
            { value: "true", label: "Log everything (default)" },
            { value: "false", label: "Log nothing" },
            { value: "content_only", label: "Content only" },
            { value: "number_only", label: "Numbers only" },
          ],
        },
        {
          key: "trackable",
          label: "Trackable",
          type: "boolean",
          hint: "Set for messages with trackable actions such as 2FA codes.",
        },
      ],
    },
  ],

  output: [
    { key: "message", type: "string", label: "Status message" },
    { key: "message_uuid", type: "array", label: "Message UUIDs, one per recipient" },
    { key: "api_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    const from = input.from?.trim();
    const powerpack = input.powerpackUuid?.trim();
    if (!from && !powerpack) {
      throw new Error("A sender is required: set `from` or `powerpackUuid`.");
    }
    const dst = joinDestinations(input.to);
    if (!dst) throw new Error("`to` is required.");
    const media = (input.mediaUrls ?? []).map((u) => String(u).trim()).filter(Boolean);
    if (!input.text && media.length === 0) {
      throw new Error("Set `text`, `mediaUrls`, or both — Plivo has nothing to send otherwise.");
    }

    return new PlivoClient(ctx).request("Message/", {
      method: "POST",
      json: {
        src: from,
        powerpack_uuid: powerpack,
        dst,
        text: input.text,
        type: input.type ?? (media.length ? "mms" : undefined),
        media_urls: media.length ? media : undefined,
        url: input.callbackUrl,
        method: input.callbackMethod,
        message_expiry: input.messageExpiry,
        log: input.log,
        trackable: input.trackable,
      },
    });
  },
};

export default sendMessage;

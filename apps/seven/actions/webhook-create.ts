import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/** `POST /api/hooks` — answers `{success, code, id, error_message}`. */
interface Input {
  target_url: string;
  event_type: string;
  request_method?: string;
  headers?: string;
  event_filter?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Register Webhook",
  description:
    "Subscribe a URL to a class of seven events (inbound SMS, delivery reports, voice, tracking).",
  idempotent: false,
  params: [
    { key: "target_url", label: "Target URL", type: "string", required: true },
    {
      key: "event_type",
      label: "Event type",
      type: "select",
      required: true,
      options: [
        { value: "all", label: "All events" },
        { value: "sms_mo", label: "Inbound SMS" },
        { value: "dlr", label: "SMS status reports" },
        { value: "rcs", label: "RCS events and inbound RCS" },
        { value: "wa_mo", label: "Inbound WhatsApp message" },
        { value: "voice_call", label: "Voice call info" },
        { value: "voice_status", label: "Voice call status updates" },
        { value: "voice_dtmf", label: "Incoming DTMF in voice calls" },
        { value: "tracking", label: "Link clicks and views (performance tracking)" },
      ],
    },
    {
      key: "request_method",
      label: "Delivery method",
      type: "select",
      default: "POST",
      options: [
        { value: "POST", label: "POST, form-encoded" },
        { value: "GET", label: "GET, query parameters" },
        { value: "JSON", label: "POST, JSON payload" },
      ],
    },
    {
      key: "headers",
      label: "Custom headers",
      type: "text",
      secret: true,
      hint: "One `Name: value` per line, sent with every delivery. May hold credentials.",
    },
    {
      key: "event_filter",
      label: "Inbound number filter",
      type: "string",
      hint:
        "Only for Inbound SMS: the inbound number in international format without +. Leave empty for every other event type: a value there prevents delivery.",
      showIf: { "==": [{ var: "event_type" }, "sms_mo"] },
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the webhook was registered" },
    { key: "id", type: "number", label: "Webhook id" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("POST", "/hooks", {
      form: {
        target_url: input.target_url,
        event_type: input.event_type,
        request_method: input.request_method,
        headers: input.headers,
        event_filter: input.event_type === "sms_mo" ? input.event_filter : undefined,
      },
    });
  },
};

export default webhookCreate;

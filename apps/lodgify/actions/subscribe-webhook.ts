import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireText } from "../lib/client.ts";

/**
 * Subscribe to a Lodgify event. Wraps `POST /webhooks/v1/subscribe`; body `{target_url,
 * event}`; answers `{id, secret}`. Per the Webhooks guide the `target_url` must be unique
 * and the signing `secret` is returned ONLY at creation, so it is passed back to the
 * caller here and cannot be read again.
 */
const EVENTS = [
  "rate_change",
  "availability_change",
  "booking_new_any_status",
  "booking_new_status_booked",
  "booking_change",
  "booking_status_change_booked",
  "booking_status_change_tentative",
  "booking_status_change_open",
  "booking_status_change_declined",
  "guest_message_received",
] as const;

const action: ActionDefinition = {
  key: "subscribe-webhook",
  type: "perform",
  idempotent: false,
  resource: "webhook",
  title: "Subscribe to a webhook",
  description: "Have Lodgify call a URL when an event happens. The signing secret is returned " +
    "once, only here.",
  params: [
    {
      key: "event",
      label: "Event",
      type: "select",
      required: true,
      options: EVENTS.map((e) => ({ value: e, label: e })),
    },
    {
      key: "targetUrl",
      label: "Target URL",
      type: "string",
      required: true,
      hint: "Must be unique across your subscriptions and answer 200 OK.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "secret", type: "string", label: "Signing secret (shown once)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const event = requireText(p.event, "event");
    if (!(EVENTS as readonly string[]).includes(event)) {
      throw new Error(`\`event\` must be one of ${EVENTS.join(", ")}`);
    }
    return await new LodgifyClient(ctx).request("/webhooks/v1/subscribe", {
      method: "POST",
      body: { target_url: requireText(p.targetUrl, "targetUrl"), event },
    });
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, compact } from "../lib/client.ts";
import { WEBHOOK_EVENTS } from "../lib/params.ts";

/** `POST /webhooks/subscriptions` — Anchor operation `subscribeWebhook`. */
interface Input {
  url: string;
  events: string[];
}

const webhookSubscribe: ActionDefinition<Input> = {
  key: "webhook-subscribe",
  type: "perform",
  resource: "webhook",
  title: "Subscribe Webhook",
  description:
    "Create or update the subscription for a URL; each call REPLACES that URL's event types. The response carries the key for verifying payloads.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Target URL",
      type: "string",
      required: true,
      hint: "Anchor will POST events here.",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: WEBHOOK_EVENTS.map((e) => ({ value: e, label: e })),
      hint: "Include every type you want: a repeat call replaces the list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    {
      key: "encryptionKey",
      type: "string",
      label: "Key for verifying payloads \u2014 returned only here",
    },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", "/webhooks/subscriptions", {
      body: compact({ url: input.url, events: input.events }),
    });
  },
};

export default webhookSubscribe;

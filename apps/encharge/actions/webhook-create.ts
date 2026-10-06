import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";

/**
 * Create Webhook Subscription — `POST /v1/event-subscriptions` with `{ eventType, targetUrl }`.
 * Verified against the OpenAPI document (`CreateWebhook`, 201 `{ subscription: { id } }`), fetched
 * 2026-10-06. Supported events: `newUser`, `updatedUser`, `unsubscribedUser`, `added-tag-X`,
 * `removed-tag-X`.
 */
interface Input {
  eventType: string;
  targetUrl: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhooks",
  title: "Create Webhook Subscription",
  description: "Subscribe a URL to an Encharge event. Encharge POSTs the person's data to it " +
    "whenever the event happens.",
  idempotent: false,
  params: [
    {
      key: "eventType",
      label: "Event",
      type: "string",
      required: true,
      hint: "newUser, updatedUser, unsubscribedUser, added-tag-<tag> or removed-tag-<tag>, " +
        "e.g. added-tag-signed-up.",
    },
    {
      key: "targetUrl",
      label: "Target URL",
      type: "string",
      required: true,
      hint: "The HTTPS URL Encharge will POST to.",
    },
  ],
  output: [{
    key: "subscription",
    type: "object",
    label: "The subscription (`id`, needed to delete it)",
  }],

  async execute(input, ctx) {
    const eventType = (input.eventType ?? "").trim();
    const targetUrl = (input.targetUrl ?? "").trim();
    if (!eventType) throw new Error("`eventType` is required.");
    if (!targetUrl) throw new Error("`targetUrl` is required.");
    return await new EnchargeClient(ctx).request("POST", "/event-subscriptions", {
      body: { eventType, targetUrl },
    });
  },
};

export default webhookCreate;

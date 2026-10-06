import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient, encodeId } from "../lib/client.ts";

/**
 * Delete Webhook Subscription — `DELETE /v1/event-subscriptions/{id}`. Verified against the
 * OpenAPI document (`DeleteWebhook`, 204), fetched 2026-10-06.
 */
interface Input {
  subscriptionId: number | string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhooks",
  title: "Delete Webhook Subscription",
  description: "Delete an event subscription by its id.",
  idempotent: true,
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "number",
      required: true,
      hint: "The `subscription.id` returned by Create Webhook Subscription.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when Encharge accepted the request" }],

  async execute(input, ctx) {
    const id = String(input.subscriptionId ?? "").trim();
    if (!id) throw new Error("`subscriptionId` is required.");
    return await new EnchargeClient(ctx).request("DELETE", `/event-subscriptions/${encodeId(id)}`);
  },
};

export default webhookDelete;

import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `DELETE /v1.0/webhook/{subscribeId}` — remove a webhook subscription.
 *
 * The subscription must belong to the caller's team. The response body is
 * empty, so the id and HTTP status are returned.
 *
 * Deleting a subscription is how a duplicate created by a retried registration
 * is cleaned up — see Create Webhook for why that matters.
 */
interface Input {
  subscribeId: number;
}

const action: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription by id (DELETE /v1.0/webhook/{subscribeId}).",
  idempotent: true,
  params: [
    {
      key: "subscribeId",
      label: "Subscription ID",
      type: "number",
      required: true,
      hint: "The `subscribeId` from a Create Webhook or List Webhooks result.",
    },
  ],
  output: [
    { key: "subscribeId", type: "number", label: "Deleted subscription ID" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new LoftyClient(ctx).status(`/webhook/${input.subscribeId}`, {
      method: "DELETE",
    });
    return { subscribeId: input.subscribeId, status };
  },
};

export default action;

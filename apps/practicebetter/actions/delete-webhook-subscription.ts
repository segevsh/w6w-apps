import type { ActionDefinition } from "@w6w/types";
import { encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `DELETE /webhooks/subscription/{subscriptionId}` — remove a webhook subscription.
 *
 * Security: **`[read]`** — the document's own text, like the create beside it,
 * and written here as declared rather than "corrected".
 *
 * **Success is `204 No Content`, not `200`** — there is no body to parse. That is
 * exactly why this action uses the client's `status()` helper and reports
 * `deleted: status === 204` instead of trying to read JSON: a `204` routed
 * through a JSON parse would look like a failure. `200`/`202` are treated as
 * successes too, since the document declares no response body for any of them,
 * but only `204` is *this* endpoint's documented success.
 */
interface Input {
  subscriptionId: string;
}

const deleteWebhookSubscription: ActionDefinition<Input, { status: number; deleted: boolean }> = {
  key: "delete-webhook-subscription",
  type: "perform",
  resource: "webhook-subscription",
  title: "Delete Webhook Subscription",
  description:
    "Remove a webhook subscription. Returns 204 with no body on success, which this action handles " +
    "explicitly rather than expecting JSON.",
  idempotent: true,
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      required: true,
      hint: "The subscription's `id`. Use `list-webhook-subscriptions` to find it.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "deleted", type: "boolean", label: "True when the API answered 204 No Content" },
  ],

  async execute(input, ctx) {
    const status = await new PracticeBetterClient(ctx).status(
      `/webhooks/subscription/${encodeId(input.subscriptionId)}`,
      { method: "DELETE" },
    );
    return { status, deleted: status === 204 };
  },
};

export default deleteWebhookSubscription;

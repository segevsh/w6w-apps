import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `DELETE /webhooks/subscriptions/{id}` — Anchor operation `unsubscribeWebhook`. */
interface Input {
  id: string;
}

const webhookUnsubscribe: ActionDefinition<Input> = {
  key: "webhook-unsubscribe",
  type: "perform",
  resource: "webhook",
  title: "Unsubscribe Webhook",
  description: "Remove a webhook subscription; its URL stops receiving events.",
  idempotent: false,
  params: [
    { key: "id", label: "Subscription ID", type: "string", required: true },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Anchor accepted the request" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("DELETE", `/webhooks/subscriptions/${encodeId(input.id)}`);
  },
};

export default webhookUnsubscribe;

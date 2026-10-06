import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { statusOutput } from "../lib/params.ts";

/** `DELETE /v1/webhooks/subscriptions/{id}` — stops the corresponding callbacks. */
interface Input {
  id: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription, disabling its callbacks.",
  idempotent: true,
  params: [{ key: "id", label: "Webhook ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Webhook deleted" }, ...statusOutput],

  async execute(input, ctx) {
    const status = await new EzTextingClient(ctx).status(
      `/webhooks/subscriptions/${encodePathSegment(input.id)}`,
      { method: "DELETE" },
    );
    return { id: input.id, status };
  },
};

export default webhookDelete;

import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/** DELETE /webhooks/{webhookId} — remove a subscription. Responds 204, no body. */
const webhookDelete: ActionDefinition<Input, Record<string, unknown>> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Webhooks.",
    },
  ],
  output: [
    { key: "webhookId", type: "string", label: "Deleted webhook ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Tally webhook", { webhookId: input.webhookId });
    await new TallyClient(ctx).request(
      `/webhooks/${encodeURIComponent(input.webhookId)}`,
      { method: "DELETE" },
    );
    return { webhookId: input.webhookId, deleted: true };
  },
};

export default webhookDelete;

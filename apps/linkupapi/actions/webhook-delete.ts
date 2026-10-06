import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input, ActionResult> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhooks",
  title: "Delete Webhook",
  description: "Permanently delete a webhook.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).request(
      "DELETE",
      `/v2/webhooks/${encodeId(input.webhookId, "webhookId")}`,
    );
  },
};

export default webhookDelete;

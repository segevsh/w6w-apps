import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook so Ironclad stops sending its events.",
  idempotent: false,
  params: [webhookIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Whether the webhook was deleted" }, {
    key: "webhookId",
    type: "string",
    label: "Webhook ID",
  }],

  async execute(input, ctx) {
    await new IroncladClient(ctx).json(`/webhooks/${encodeId(input.webhookId)}`, {
      method: "DELETE",
    });
    return { deleted: true, webhookId: input.webhookId };
  },
};

export default webhookDelete;

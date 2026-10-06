import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, stripWebhookSecrets } from "../lib/client.ts";

/**
 * `DELETE /webhook/{id}` — remove a webhook. Answers the remaining webhook
 * list. Events already queued for the target are NOT cancelled by deletion.
 */
interface Input {
  webhookId: number;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by id. Returns the remaining webhooks.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "items", type: "array", label: "Webhooks remaining" }],
  async execute(input, ctx) {
    const id = Number(input.webhookId);
    if (!Number.isInteger(id) || id < 1) throw new Error("Webhook ID must be a positive integer");
    const all = await new PrintNodeClient(ctx).json<unknown[]>(`/webhook/${id}`, {
      method: "DELETE",
    });
    return { items: stripWebhookSecrets(all) };
  },
};

export default webhookDelete;

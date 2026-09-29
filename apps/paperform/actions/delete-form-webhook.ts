import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /webhooks/{id}` — delete a webhook by ID.
 *
 * Business plan only, per Paperform's own docs. `idempotent: true` — the end state (webhook
 * gone) is the same however many times this runs.
 */
const deleteFormWebhook: ActionDefinition<Input> = {
  key: "delete-form-webhook",
  type: "perform",
  resource: "webhook",
  title: "Delete Form Webhook",
  description: "Delete a webhook by ID. Requires the Business plan.",
  idempotent: true,
  params: [webhookIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting Paperform webhook", { id: input.id });
    const deleted = await new PaperformClient(ctx).deleted(
      `/webhooks/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { deleted };
  },
};

export default deleteFormWebhook;

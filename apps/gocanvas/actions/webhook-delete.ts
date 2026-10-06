import type { ActionDefinition } from "@w6w/types";
import { deleted, encodeId, GoCanvasClient, hardDeleteQuery } from "../lib/client.ts";
import { hardDeleteParam, idParam } from "../lib/params.ts";

interface Input {
  formId: number;
  webhookId: number;
  hardDelete?: boolean;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Soft-delete a webhook, or permanently delete it.",
  idempotent: true,
  params: [
    idParam("formId", "Form ID"),
    idParam("webhookId", "Webhook ID"),
    hardDeleteParam,
  ],
  output: [
    { key: "data", type: "object", label: "The API's confirmation" },
  ],

  async execute(input, ctx) {
    return deleted(
      await new GoCanvasClient(ctx).request(
        `/forms/${encodeId(input.formId)}/webhooks/${encodeId(input.webhookId)}`,
        { method: "DELETE", query: hardDeleteQuery(input.hardDelete) },
      ),
    );
  },
};

export default webhookDelete;

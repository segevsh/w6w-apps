import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

/**
 * `DELETE /webhook/{id}` — permanently delete a webhook registration.
 *
 * The OpenAPI document declares the success body as `text/html` with an
 * empty schema — there is nothing meaningful to parse, so only the HTTP
 * status is reported.
 *
 * `idempotent: true`: the end state after one call and after five is the
 * same webhook gone.
 */
interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Permanently delete a webhook registration by id.",
  idempotent: true,
  params: [webhookIdParam],
  output: [
    { key: "webhookId", type: "string", label: "Webhook deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new ParseurClient(ctx).status(`/webhook/${encodeId(input.webhookId)}`, {
      method: "DELETE",
    });
    return { webhookId: input.webhookId, status };
  },
};

export default webhookDelete;

import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `GET /webhooks/{id}` — a webhook by ID.
 *
 * Business plan only, per Paperform's own docs.
 */
const getFormWebhook: ActionDefinition<Input> = {
  key: "get-form-webhook",
  type: "read",
  resource: "webhook",
  title: "Get Form Webhook",
  description: "Get a webhook by ID. Requires the Business plan.",
  params: [webhookIdParam],
  output: [{ key: "webhook", type: "object", label: "Webhook" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ webhook?: unknown }>(
      `/webhooks/${encodeURIComponent(input.id)}`,
    );
    return { webhook: results?.webhook };
  },
};

export default getFormWebhook;

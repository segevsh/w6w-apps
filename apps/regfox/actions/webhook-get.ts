import type { ActionDefinition } from "@w6w/types";
import { encodeId, redactWebhook, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `GET /v2/public/webhooks/{id}` */
const webhookGet: ActionDefinition<Record<string, unknown>> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Get one webhook by id. The signing secret and legacy token are removed.",
  params: [requiredId("webhookId", "Webhook ID")],
  output: [{ key: "webhook", type: "object", label: "The webhook" }],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call(`/webhooks/${encodeId(input.webhookId)}`);
    return { webhook: redactWebhook(body.data) };
  },
};

export default webhookGet;

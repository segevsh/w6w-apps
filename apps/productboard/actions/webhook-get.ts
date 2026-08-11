import type { ActionDefinition } from "@w6w/types";
import { type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";

/**
 * `GET /v2/webhooks/{webhookId}` — one webhook subscription.
 *
 * Note the path parameter is named `webhookId`, not `id`, unlike every other
 * single-resource path in v2. Cosmetic on the wire, but it is why this action's
 * param is spelled the same way.
 *
 * As with the list, the configured `Authorization` header is never returned.
 */
interface Input {
  webhookId: string;
}

const webhookGet: ActionDefinition<Input, DataResult> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get webhook",
  description: "Retrieve one webhook subscription by ID, minus its configured secret.",
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      placeholder: "550e8400-e29b-41d4-a716-446655440000",
      hint: "UUID from a List webhooks result.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Webhook subscription" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(
      `/webhooks/${encodeId(input.webhookId)}`,
    );
    return { data };
  },
};

export default webhookGet;

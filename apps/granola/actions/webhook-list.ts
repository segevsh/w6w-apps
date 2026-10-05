import type { ActionDefinition } from "@w6w/types";
import { GranolaClient, type GranolaWebhookEndpoint } from "../lib/client.ts";

/**
 * `GET /v1/webhook-endpoints` — every endpoint, unpaginated. For endpoints the
 * caller did not create, `url` is reduced to its origin (`url_redacted: true`)
 * because the path can carry credentials.
 */
const webhookList: ActionDefinition<Record<string, never>> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhook Endpoints",
  description: "List the webhook endpoints visible to this API key.",
  params: [],
  output: [
    { key: "webhook_endpoints", type: "array", label: "Webhook endpoints" },
  ],

  execute(_input, ctx) {
    return new GranolaClient(ctx).request<{ webhook_endpoints: GranolaWebhookEndpoint[] }>(
      "/webhook-endpoints",
    );
  },
};

export default webhookList;

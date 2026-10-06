import { listAction } from "../lib/factory.ts";
import { stripWebhookSecrets } from "../lib/client.ts";

export default listAction({
  key: "webhook-list",
  title: "List Webhooks",
  noun: "Webhook",
  type: "webhook",
  path: "webhooks",
  transform: stripWebhookSecrets,
  description:
    "List webhooks. Each webhook's signing `secret` and `cleanupToken` are removed from the result.",
});

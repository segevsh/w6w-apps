import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const getWebhook: ActionDefinition<Input> = {
  key: "get-webhook",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description:
    "Return one webhook subscription by id: its post URL, subscribed events and creation date.",
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [{ key: "webhook", type: "object", label: "Webhook" }],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request(`/webhooks/${FlodeskClient.seg(input.webhookId)}`);
  },
};

export default getWebhook;

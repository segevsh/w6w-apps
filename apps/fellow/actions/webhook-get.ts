import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  webhookId: string;
  onBehalfOf?: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Retrieve one webhook by id.",
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "From the `id` of a Create Webhook or List Webhooks result.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "id", type: "string", label: "Webhook id" },
    { key: "url", type: "string", label: "Receiving URL" },
    { key: "status", type: "string", label: "active or inactive" },
    { key: "scope", type: "string", label: "user or workspace" },
    { key: "enabled_events", type: "array", label: "Subscribed events" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).unwrap("webhook", `/webhook/${encodeId(input.webhookId)}`, {
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default webhookGet;

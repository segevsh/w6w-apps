import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";

type Input = Record<string, never>;

const webhookList: ActionDefinition<Input, ActionResult> = {
  key: "webhook-list",
  type: "read",
  resource: "webhooks",
  title: "List Webhooks",
  description: "List the webhooks registered for the API key.",
  params: [],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(_input, ctx) {
    return await new LinkupApiClient(ctx).request("GET", "/v2/webhooks");
  },
};

export default webhookList;

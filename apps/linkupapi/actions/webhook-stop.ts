import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const webhookStop: ActionDefinition<Input, ActionResult> = {
  key: "webhook-stop",
  type: "perform",
  resource: "webhooks",
  title: "Stop Monitoring",
  description: "Stop monitoring for a webhook without deleting it.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).request(
      "POST",
      `/v2/webhooks/${encodeId(input.webhookId, "webhookId")}/stop`,
    );
  },
};

export default webhookStop;

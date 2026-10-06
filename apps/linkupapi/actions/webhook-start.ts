import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const webhookStart: ActionDefinition<Input, ActionResult> = {
  key: "webhook-start",
  type: "perform",
  resource: "webhooks",
  title: "Start Monitoring",
  description: "Resume monitoring for a stopped webhook.",
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
      `/v2/webhooks/${encodeId(input.webhookId, "webhookId")}/start`,
    );
  },
};

export default webhookStart;

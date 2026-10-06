import type { ActionDefinition } from "@w6w/types";
import { encodeId, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `GET /v2/public/webhooks/{webhookid}/logs/{webhookLogid}` */
const webhookLogGet: ActionDefinition<Record<string, unknown>> = {
  key: "webhook-log-get",
  type: "read",
  resource: "webhook-log",
  title: "Get Webhook Delivery",
  description: "Get one delivery from a webhook's log, including what was sent and answered.",
  params: [requiredId("webhookId", "Webhook ID"), requiredId("logId", "Delivery log ID")],
  output: [{ key: "log", type: "object", label: "The delivery log entry" }],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call(
      `/webhooks/${encodeId(input.webhookId)}/logs/${encodeId(input.logId)}`,
    );
    return { log: body.data };
  },
};

export default webhookLogGet;

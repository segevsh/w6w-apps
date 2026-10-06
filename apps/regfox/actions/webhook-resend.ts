import type { ActionDefinition } from "@w6w/types";
import { encodeId, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `POST /v2/public/webhooks/{webhookid}/resend/{logId}` */
const webhookResend: ActionDefinition<Record<string, unknown>> = {
  key: "webhook-resend",
  type: "perform",
  resource: "webhook-log",
  title: "Resend Webhook Delivery",
  description: "Send a logged webhook delivery to its endpoint again. The signature header is " +
    "unchanged on a resend, so the receiver sees the original payload and HMAC.",
  idempotent: false,
  params: [requiredId("webhookId", "Webhook ID"), requiredId("logId", "Delivery log ID")],
  output: [{ key: "response", type: "object", label: "The vendor's response data" }],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call(
      `/webhooks/${encodeId(input.webhookId)}/resend/${encodeId(input.logId)}`,
      { method: "POST" },
    );
    return { response: body.data ?? {} };
  },
};

export default webhookResend;

import type { ActionDefinition } from "@w6w/types";
import { call, need, seg, str } from "../lib/client.ts";

/**
 * `DELETE /v3/webhooks/{webhookUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "delete-webhook",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook.",
  idempotent: true,
  params: [
    { key: "webhookUid", label: "Webhook UID", type: "string", required: true },
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const webhookUid = need("webhookUid", str(p.webhookUid));
    ctx.log("info", "Contentstack Delete Webhook", { webhookUid });
    return await call(ctx, "DELETE", `/webhooks/${seg(webhookUid)}`);
  },
};

export default action;

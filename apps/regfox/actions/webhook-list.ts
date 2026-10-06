import type { ActionDefinition } from "@w6w/types";
import { redactWebhook, RegfoxClient } from "../lib/client.ts";

/** `GET /v2/public/webhooks` — the vendor implements no filtering on this resource. */
const webhookList: ActionDefinition<Record<string, unknown>> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the account's webhooks. Signing secrets and legacy tokens are removed " +
    "from the result.",
  params: [],
  output: [
    { key: "webhooks", type: "array", label: "Webhooks" },
    { key: "totalResults", type: "number", label: "Total webhooks" },
  ],
  async execute(_input, ctx) {
    const body = await new RegfoxClient(ctx).call<unknown[]>("/webhooks");
    return { webhooks: (body.data ?? []).map(redactWebhook), totalResults: body.totalResults };
  },
};

export default webhookList;

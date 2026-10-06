import type { ActionDefinition } from "@w6w/types";
import { encodeId, omitKeys, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one webhook by id (`GET /webhooks/{id}`). The signature token and custom headers are removed from the answer.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description:
    "Get one webhook by id (`GET /webhooks/{id}`). The signature token and custom headers are removed from the answer.",
  params: [
    { key: "id", label: "Webhook ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Webhook"),

  async execute(input, ctx) {
    const out = await new ProductiveClient(ctx).one(`/webhooks/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
    return omitKeys(out, ["signature_token", "custom_headers"]);
  },
};

export default webhookGet;

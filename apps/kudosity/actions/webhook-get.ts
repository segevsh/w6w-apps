import type { ActionDefinition } from "@w6w/types";
import { encodeId, KudosityClient } from "../lib/client.ts";

/** `GET /v2/webhook/{id}`. */
interface Input {
  id: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Retrieve a webhook by id.",
  params: [{ key: "id", label: "Webhook ID", type: "string", required: true, hint: "A UUID." }],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "filter", type: "object", label: "Filter" },
    { key: "rate_limit", type: "number", label: "Rate limit (requests/second)" },
  ],

  async execute(input, ctx) {
    return await new KudosityClient(ctx).json(`/webhook/${encodeId(input.id)}`);
  },
};

export default webhookGet;

import type { ActionDefinition } from "@w6w/types";
import { SignWellClient } from "../lib/client.ts";

interface Hook {
  id?: string;
  callback_url?: string;
  api_application_id?: string;
}

/**
 * `GET /api/v1/hooks` — verified against SignWell's OpenAPI document (`listWebhooks`). The
 * response is a bare array of `{ id, callback_url, api_application_id }`, wrapped here so the
 * output is an object.
 */
const webhookList: ActionDefinition = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhooks registered for document events.",
  params: [],
  output: [
    { key: "webhooks", type: "array", label: "Webhooks (id, callback_url, api_application_id)" },
    { key: "count", type: "number", label: "Number of webhooks" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing SignWell webhooks");
    const hooks = await new SignWellClient(ctx).request<Hook[]>("/hooks");
    const webhooks = Array.isArray(hooks) ? hooks : [];
    return { webhooks, count: webhooks.length };
  },
};

export default webhookList;

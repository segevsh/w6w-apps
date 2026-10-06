import type { ActionDefinition } from "@w6w/types";
import { SignWellClient } from "../lib/client.ts";
import { bodyFromParams } from "../lib/params.ts";

const PARAMS = [
  {
    key: "callback_url",
    label: "Callback URL",
    type: "string",
    required: true,
    hint: "SignWell POSTs document events here.",
  },
  { key: "api_application_id", label: "API application id", type: "string" },
] as const;

/**
 * `POST /api/v1/hooks` — verified against SignWell's OpenAPI document (`createWebhook`).
 * `callback_url` is required, `api_application_id` optional; response 201 is
 * `{ id, callback_url, api_application_id }`.
 */
const webhookCreate: ActionDefinition = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create a Webhook",
  description: "Register a callback URL that SignWell posts document events to.",
  idempotent: false,
  params: [...PARAMS],
  output: [
    { key: "id", type: "string", label: "Webhook id" },
    { key: "callback_url", type: "string", label: "Callback URL" },
    { key: "api_application_id", type: "string", label: "API application id" },
  ],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    if (!i.callback_url) throw new Error("`callback_url` is required.");
    ctx.log("info", "creating a SignWell webhook");
    return await new SignWellClient(ctx).request("/hooks", {
      method: "POST",
      body: bodyFromParams(i, [...PARAMS]),
    });
  },
};

export default webhookCreate;

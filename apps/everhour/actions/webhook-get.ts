import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /hooks/{hookId}` — Fetch one webhook.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  hookId: number;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Fetch one webhook.",
  params: [
    {
      key: "hookId",
      label: "Webhook ID",
      type: "number",
      required: true,
      hint: "Numeric webhook id.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webhook ID" },
    { key: "targetUrl", type: "string", label: "Target URL" },
    { key: "events", type: "array", label: "Events" },
    { key: "isActive", type: "boolean", label: "Active" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/hooks/${encodeId(input.hookId)}`);
  },
};

export default webhookGet;

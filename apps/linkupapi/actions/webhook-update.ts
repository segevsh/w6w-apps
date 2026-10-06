import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  webhookId: string;
  url?: string;
  events?: string;
  retry?: boolean;
  isActive?: boolean;
}

const FIELDS: readonly Field[] = [
  ["url", "url", "s"],
  ["events", "events", "m"],
  ["retry", "retry", "b"],
  ["isActive", "is_active", "b"],
];

const webhookUpdate: ActionDefinition<Input, ActionResult> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhooks",
  title: "Update Webhook",
  description: "Change a webhook's URL, events, retry policy or pause it.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "url", label: "URL", type: "string" },
    {
      key: "events",
      label: "Events",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    { key: "retry", label: "Retry failed deliveries", type: "boolean" },
    { key: "isActive", label: "Active", type: "boolean", hint: "False pauses the webhook." },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).request(
      "PUT",
      `/v2/webhooks/${encodeId(input.webhookId, "webhookId")}`,
      { body: mapInput(input, FIELDS) },
    );
  },
};

export default webhookUpdate;

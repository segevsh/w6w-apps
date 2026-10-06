import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  webhookId: string;
  after?: string;
  since?: string;
  until?: string;
  count?: number;
}

const FIELDS: readonly Field[] = [
  ["after", "after", "s"],
  ["since", "since", "s"],
  ["until", "until", "s"],
  ["count", "count", "n"],
];

const webhookEventsList: ActionDefinition<Input, ActionResult> = {
  key: "webhook-events-list",
  type: "read",
  resource: "webhooks",
  title: "Poll Webhook Events",
  description:
    "Read the events stored for a webhook, the catch-up path for hosted and custom webhooks.",
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    {
      key: "after",
      label: "After event",
      type: "string",
      hint: "The event_id of the last event processed; stabler than since.",
    },
    { key: "since", label: "Since", type: "string", hint: "ISO 8601 datetime; only later events." },
    { key: "until", label: "Until", type: "string", hint: "ISO 8601 datetime." },
    { key: "count", label: "Count", type: "number", hint: "1-200, default 50." },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).request(
      "GET",
      `/v2/webhooks/${encodeId(input.webhookId, "webhookId")}/events`,
      { query: mapInput(input, FIELDS) },
    );
  },
};

export default webhookEventsList;

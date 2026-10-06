import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";
import { redactWebhook } from "../lib/redact.ts";

interface Input {
  limit?: number;
  after?: string;
  before?: string;
}

/** List webhook subscriptions. The signing `secret` is redacted. */
const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhook Subscriptions",
  description: "List webhook subscriptions. The signing `secret` is redacted.",
  params: [
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Page size, 1-100.",
      "default": 50,
      "validation": { "min": 1, "max": 100, "integer": true },
    },
    {
      "key": "after",
      "label": "After",
      "type": "string",
      "hint": "Cursor: pass the previous page's `nextCursor` to get the next page.",
    },
    {
      "key": "before",
      "label": "Before",
      "type": "string",
      "hint":
        "Cursor for paging backwards (the previous page's `previous_cursor`). Use either After or Before, not both.",
    },
  ],
  output: [
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "nextCursor", "type": "string", "label": "Next page cursor (null on the last page)" },
    { "key": "pagination", "type": "object", "label": "Pagination cursors and URLs" },
  ],

  async execute(input, ctx) {
    const page = await new SuperchatClient(ctx).list<Record<string, unknown>>("/webhooks", input);
    return { ...page, results: page.results.map(redactWebhook) };
  },
};

export default webhookList;

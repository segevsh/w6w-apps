import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  limit?: number;
  after?: string;
  before?: string;
  direction?: string;
  createdAfter?: string;
  createdBefore?: string;
}

/** List the messages in a conversation, optionally only one direction or a time window. */
const conversationMessagesList: ActionDefinition<Input> = {
  key: "conversation-messages-list",
  type: "read",
  resource: "conversation",
  title: "List Conversation Messages",
  description:
    "List the messages in a conversation, optionally only one direction or a time window.",
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Page size, 1-100.",
      "default": 20,
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
    {
      "key": "direction",
      "label": "Direction",
      "type": "select",
      "hint": "Upper-case in the API.",
      "options": [{ "value": "INBOUND", "label": "Inbound" }, {
        "value": "OUTBOUND",
        "label": "Outbound",
      }],
    },
    { "key": "createdAfter", "label": "Created after", "type": "datetime", "hint": "ISO 8601." },
    { "key": "createdBefore", "label": "Created before", "type": "datetime", "hint": "ISO 8601." },
  ],
  output: [
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "nextCursor", "type": "string", "label": "Next page cursor (null on the last page)" },
    { "key": "pagination", "type": "object", "label": "Pagination cursors and URLs" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).list(
      `/conversations/${seg(input.conversationId)}/messages`,
      input,
      {
        direction: input.direction,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
      },
    );
  },
};

export default conversationMessagesList;

import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after?: string;
  before?: string;
  contactId: string;
}

/** List a contact's conversations, newest first, one cursor page at a time. */
const contactConversationsList: ActionDefinition<Input> = {
  key: "contact-conversations-list",
  type: "read",
  resource: "contact",
  title: "List Contact Conversations",
  description: "List a contact's conversations, newest first, one cursor page at a time.",
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
    { "key": "contactId", "label": "Contact ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "nextCursor", "type": "string", "label": "Next page cursor (null on the last page)" },
    { "key": "pagination", "type": "object", "label": "Pagination cursors and URLs" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).list(`/contacts/${seg(input.contactId)}/conversations`, input);
  },
};

export default contactConversationsList;

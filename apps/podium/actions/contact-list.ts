import type { ActionDefinition } from "@w6w/types";
import { PodiumClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
  updatedAfter?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts, optionally only those updated after a date. Requires scope `read_contacts`.",
  params: [{
    key: "limit",
    label: "Limit",
    type: "number",
    hint: "Items per page, 1-100 (Podium's default is 10).",
    validation: {
      integer: true,
      min: 1,
      max: 100,
    },
  }, {
    key: "cursor",
    label: "Cursor",
    type: "string",
    hint:
      "`nextCursor` from the previous page. A cursor carries its own filters, so when it is set every other filter below is ignored by Podium.",
  }, {
    key: "updatedAfter",
    label: "Updated after",
    type: "string",
    hint: "ISO 8601; only contacts updated after this time.",
  }],
  output: [{
    key: "items",
    type: "array",
    label: "Items",
  }, {
    key: "nextCursor",
    type: "string",
    label: "Cursor for the next page (null on the last page)",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).list("/contacts", {
      query: {
        limit: input.limit,
        cursor: input.cursor,
        updated_at: input.updatedAfter,
      },
    });
  },
};

export default contactList;

import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  startAfterId?: string;
  startAfter?: number;
  query?: string;
}

const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts for the connected location. Cursor-paginated: take the last returned " +
    "contact's `id` and `dateAdded`, pass them back as `startAfterId`/`startAfter` for the next page.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "startAfterId", label: "Start after (contact ID)", type: "string" },
    { key: "startAfter", label: "Start after (timestamp, ms)", type: "number" },
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Free-text search over name/email/phone.",
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Total matching contacts" },
  ],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/contacts/", {
      query: {
        locationId: client.locationId,
        limit: input.limit ?? 20,
        startAfterId: input.startAfterId,
        startAfter: input.startAfter,
        query: input.query,
      },
    });
  },
};

export default listContacts;

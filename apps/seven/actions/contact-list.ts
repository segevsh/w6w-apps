import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/** `GET /api/contacts` — paged contact list: `{pagingMetadata, data}`. */
interface Input {
  search?: string;
  group_id?: number;
  order_by?: string;
  order_direction?: string;
  limit?: number;
  offset?: number;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally filtered by a search term or group, with paging.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Searched across all columns." },
    { key: "group_id", label: "Group ID", type: "number", validation: { integer: true, min: 1 } },
    { key: "order_by", label: "Order by", type: "string", hint: "The column to sort by." },
    {
      key: "order_direction",
      label: "Order direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Contacts per page, 30 to 500 (vendor default 30).",
      validation: { integer: true, min: 30, max: 500 },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "The vendor calls this the page to display.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Contacts" },
    { key: "pagingMetadata", type: "object", label: "offset, count, total, limit, has_more" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("GET", "/contacts", {
      query: {
        search: input.search,
        group_id: input.group_id,
        order_by: input.order_by,
        order_direction: input.order_direction,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default contactList;

import type { ActionDefinition } from "@w6w/types";
import { unset, ZendeskClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  sortBy?: string;
  sortOrder?: string;
  pageSize?: number;
  cursor?: string;
}

const ticketGetMany: ActionDefinition<Input> = {
  key: "ticket-get-many",
  type: "search",
  resource: "ticket",
  title: "List Tickets",
  description: "List tickets with cursor pagination. Use `ticket-search` to filter.",
  params: [
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created_at",
      row: "sort",
      options: [
        { value: "created_at", label: "Created" },
        { value: "updated_at", label: "Updated" },
        { value: "id", label: "ID" },
      ],
    },
    {
      key: "sortOrder",
      label: "Order",
      type: "select",
      default: "desc",
      row: "sort",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    ...pagination,
  ],
  output: [
    { key: "tickets", type: "array", label: "Tickets" },
    { key: "meta", type: "object", label: "Cursor meta (has_more, after_cursor)" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request("/tickets.json", {
      query: {
        "page[size]": input.pageSize,
        "page[after]": unset(input.cursor),
        sort_by: unset(input.sortBy),
        sort_order: unset(input.sortOrder),
      },
    });
  },
};

export default ticketGetMany;

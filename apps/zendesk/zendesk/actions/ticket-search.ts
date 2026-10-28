import type { ActionDefinition } from "@w6w/types";
import { unset, ZendeskClient } from "../lib/client.ts";

interface Input {
  query: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
}

/**
 * Uses Zendesk's unified search endpoint with a `type:ticket` guard prepended,
 * so the results are always tickets even if the user's query omits it.
 */
const ticketSearch: ActionDefinition<Input> = {
  key: "ticket-search",
  type: "search",
  resource: "ticket",
  title: "Search Tickets",
  description: "Search tickets with Zendesk's search syntax. `type:ticket` is applied for you.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "status:open priority:urgent tags:vip",
      hint: "Zendesk search syntax: status, priority, tags, requester, created>2026-01-01, …",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      row: "sort",
      options: [
        { value: "created_at", label: "Created" },
        { value: "updated_at", label: "Updated" },
        { value: "priority", label: "Priority" },
        { value: "status", label: "Status" },
      ],
    },
    {
      key: "sortOrder",
      label: "Order",
      type: "select",
      row: "sort",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    { key: "page", label: "Page", type: "number", validation: { min: 1, integer: true } },
  ],
  output: [
    { key: "results", type: "array", label: "Tickets" },
    { key: "count", type: "number", label: "Total matches" },
    { key: "next_page", type: "string", label: "Next page URL" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request("/search.json", {
      query: {
        query: `type:ticket ${input.query}`,
        sort_by: unset(input.sortBy),
        sort_order: unset(input.sortOrder),
        page: input.page,
      },
    });
  },
};

export default ticketSearch;

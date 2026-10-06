import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, optInt, pagingQuery } from "../lib/client.ts";

interface Input {
  fulltext?: string;
  active?: boolean;
  teamsId?: number | string;
  page?: number | string;
  itemsPerPage?: number | string;
}

const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List users (GET /v3/users), filterable by active state and a full-text search. Paged.",
  params: [
    {
      key: "fulltext",
      label: "Search text",
      type: "string",
    },
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      hint: "true = active only, false = inactive only; leave unset for both.",
    },
    {
      key: "teamsId",
      label: "Team ID",
      type: "number",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number.",
    },
    {
      key: "itemsPerPage",
      label: "Items per page",
      type: "number",
      hint: "Page size.",
    },
  ],
  output: [
    {
      key: "paging",
      type: "object",
      label: "{ items_per_page, current_page, count_pages, count_items }",
    },
    { key: "data", type: "array", label: "Users" },
  ],

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v3/users", {
      query: {
        filter: {
          active: input.active,
          fulltext: input.fulltext,
          teams_id: optInt(input.teamsId, "teamsId"),
        },
        ...pagingQuery(input),
      },
    });
    return { paging: body.paging ?? null, data: Array.isArray(body.data) ? body.data : [] };
  },
};

export default listUsers;

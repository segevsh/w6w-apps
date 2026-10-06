import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, optInt, pagingQuery } from "../lib/client.ts";

interface Input {
  fulltext?: string;
  active?: boolean;
  customersId?: number | string;
  completed?: boolean;
  page?: number | string;
  itemsPerPage?: number | string;
}

const listProjects: ActionDefinition<Input> = {
  key: "list-projects",
  type: "search",
  resource: "project",
  title: "List Projects",
  description:
    "List projects (GET /v4/projects), filterable by active state and a full-text search. Paged.",
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
      key: "customersId",
      label: "Customer ID",
      type: "number",
    },
    {
      key: "completed",
      label: "Completed",
      type: "boolean",
      hint: "true = completed only, false = open only.",
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
    { key: "data", type: "array", label: "Projects" },
  ],

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v4/projects", {
      query: {
        filter: {
          active: input.active,
          fulltext: input.fulltext,
          customers_id: optInt(input.customersId, "customersId"),
          completed: input.completed,
        },
        ...pagingQuery(input),
      },
    });
    return { paging: body.paging ?? null, data: Array.isArray(body.data) ? body.data : [] };
  },
};

export default listProjects;

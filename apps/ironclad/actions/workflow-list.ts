import type { ActionDefinition } from "@w6w/types";
import { IroncladClient, toList } from "../lib/client.ts";
import { filterParam, hydrateEntitiesParam, pageParams, searchParam } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
  status?: string[] | string;
  template?: string;
  lastUpdated?: string;
  filter?: string;
  search?: string;
  hydrateEntities?: boolean;
}

const workflowList: ActionDefinition<Input> = {
  key: "workflow-list",
  type: "read",
  resource: "workflow",
  title: "List Workflows",
  description:
    "List workflows, newest page first. Without a status filter Ironclad returns only active workflows (Create, Review, Sign and Archive stages).",
  params: [
    ...pageParams,
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
      hint: "Omit for active workflows only, which is Ironclad's own default.",
    },
    {
      key: "template",
      label: "Template ID",
      type: "string",
      hint: "Only workflows launched from this template.",
    },
    {
      key: "lastUpdated",
      label: "Updated since",
      type: "string",
      hint: "Only workflows updated since this UTC date.",
    },
    filterParam,
    searchParam,
    hydrateEntitiesParam,
  ],
  output: [
    { key: "list", type: "array", label: "Workflows on this page" },
    { key: "count", type: "number", label: "Total matching across all pages" },
    { key: "page", type: "number", label: "Page" },
    { key: "pageSize", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new IroncladClient(ctx).json("/workflows", {
      query: {
        page: input.page,
        pageSize: input.pageSize,
        status: toList(input.status),
        template: input.template,
        lastUpdated: input.lastUpdated,
        filter: input.filter,
        search: input.search,
        hydrateEntities: input.hydrateEntities ? true : undefined,
      },
    });
  },
};

export default workflowList;

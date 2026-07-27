import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

interface Input {
  search?: string;
  workspaceId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  orderBy?: string;
}

/**
 * GET /forms — list forms in the account. Results are paginated (default 10,
 * max 200 per page) and can be filtered by a search string or a workspace.
 */
const formGetMany: ActionDefinition<Input> = {
  key: "form-get-many",
  type: "read",
  resource: "form",
  title: "Get Many Forms",
  description: "List forms in the account, with optional search, workspace filter and paging.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Return forms whose title contains this string.",
    },
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      hint: "Restrict to one workspace.",
    },
    { key: "page", label: "Page", type: "number", hint: "1-based page number. Default 1." },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Items per page. Default 10, maximum 200.",
      validation: { min: 1, max: 200 },
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "created_at", label: "Created at" },
        { value: "last_updated_at", label: "Last updated at" },
      ],
    },
    {
      key: "orderBy",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Forms" },
    { key: "total_items", type: "number", label: "Total items" },
    { key: "page_count", type: "number", label: "Page count" },
  ],

  execute(input, ctx) {
    return new TypeformClient(ctx).request("/forms", {
      query: {
        search: input.search,
        workspace_id: input.workspaceId,
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        order_by: input.orderBy,
      },
    });
  },
};

export default formGetMany;

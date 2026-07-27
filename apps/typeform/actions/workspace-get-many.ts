import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

interface Input {
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * GET /workspaces — list the workspaces in the account. Each carries the `href`
 * that `form-create` wants for its `workspace` reference.
 */
const workspaceGetMany: ActionDefinition<Input> = {
  key: "workspace-get-many",
  type: "read",
  resource: "workspace",
  title: "Get Many Workspaces",
  description: "List the workspaces in the account, with optional search and paging.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Return workspaces whose name contains this string.",
    },
    { key: "page", label: "Page", type: "number", hint: "1-based page number. Default 1." },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Items per page. Default 10, maximum 200.",
      validation: { min: 1, max: 200 },
    },
  ],
  output: [
    { key: "items", type: "array", label: "Workspaces" },
    { key: "total_items", type: "number", label: "Total items" },
    { key: "page_count", type: "number", label: "Page count" },
  ],

  execute(input, ctx) {
    return new TypeformClient(ctx).request("/workspaces", {
      query: {
        search: input.search,
        page: input.page,
        page_size: input.pageSize,
      },
    });
  },
};

export default workspaceGetMany;

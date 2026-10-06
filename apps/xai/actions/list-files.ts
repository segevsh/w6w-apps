import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  order?: string;
  sortBy?: string;
  paginationToken?: string;
}

/**
 * GET /v1/files. The response always carries a `pagination_token`; the end of the list is
 * reached when `data` is shorter than `limit`.
 */
const listFiles: ActionDefinition<Input> = {
  key: "list-files",
  type: "read",
  resource: "file",
  title: "List Files",
  description: "List files in xAI storage, paginated (GET /v1/files).",
  params: [
    { key: "limit", label: "Limit", type: "number", validation: { min: 1, integer: true } },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: ["created_at", "filename", "size"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "paginationToken",
      label: "Pagination token",
      type: "string",
      hint: "The `pagination_token` of the previous page.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Files" },
    { key: "pagination_token", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    return new XaiClient(ctx).request("/v1/files", {
      query: {
        limit: input.limit,
        order: input.order,
        sort_by: input.sortBy,
        pagination_token: input.paginationToken,
      },
    });
  },
};

export default listFiles;

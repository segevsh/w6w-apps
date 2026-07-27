import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

interface Input {
  page?: number;
  pageSize?: number;
}

/**
 * GET /themes — list the themes available in the account. Each carries the
 * `href` that `form-create` wants for its `theme` reference.
 */
const themeGetMany: ActionDefinition<Input> = {
  key: "theme-get-many",
  type: "read",
  resource: "theme",
  title: "Get Many Themes",
  description: "List the themes available in the account, with optional paging.",
  params: [
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
    { key: "items", type: "array", label: "Themes" },
    { key: "total_items", type: "number", label: "Total items" },
    { key: "page_count", type: "number", label: "Page count" },
  ],

  execute(input, ctx) {
    return new TypeformClient(ctx).request("/themes", {
      query: {
        page: input.page,
        page_size: input.pageSize,
      },
    });
  },
};

export default themeGetMany;

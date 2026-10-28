import type { ActionDefinition } from "@w6w/types";
import { compact, unwrapResource, ZohoSignClient } from "../lib/client.ts";
import { pageParams } from "../lib/params.ts";

interface Input {
  rowCount?: number;
  startIndex?: number;
  sortColumn?: string;
  sortOrder?: "ASC" | "DESC";
}

/**
 * `GET /templates` — verified against `template-managment/get-template-list.html`. Same
 * `data`-as-query-parameter shape as `request-list`.
 */
const action: ActionDefinition<Input> = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List reusable templates in this account.",
  params: pageParams,
  output: [
    { key: "templates", type: "array", label: "Templates" },
    { key: "page_context", type: "object", label: "Pagination info" },
  ],

  async execute(input, ctx) {
    const pageContext = compact({
      row_count: input.rowCount ?? 25,
      start_index: input.startIndex ?? 1,
      sort_column: input.sortColumn,
      sort_order: input.sortOrder,
    });

    const body = await new ZohoSignClient(ctx).get("/templates", { page_context: pageContext });
    return {
      templates: unwrapResource<unknown[]>(body, "templates"),
      page_context: body.page_context ?? {},
    };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { compact, unwrapResource, ZohoSignClient } from "../lib/client.ts";
import { pageParams } from "../lib/params.ts";

interface Input {
  rowCount?: number;
  startIndex?: number;
  sortColumn?: string;
  sortOrder?: "ASC" | "DESC";
  requestName?: string;
}

/**
 * `GET /requests` — verified against `document-managment/get-document-list.html`.
 *
 * `data` travels as a URL query parameter carrying JSON-encoded `page_context` — a GET whose
 * filters live in a query-string JSON blob rather than discrete query params, unlike most of
 * this pack's other list actions. `search_columns` is exposed here only for `request_name`
 * (the common case); the documented column set also includes `folder_name`, `owner_full_name`,
 * `recipient_email`, `recipient_name` and `form_name`.
 */
const action: ActionDefinition<Input> = {
  key: "request-list",
  type: "read",
  resource: "request",
  title: "List Requests",
  description: "List signature requests (documents) in this account.",
  params: [
    ...pageParams,
    {
      key: "requestName",
      label: "Filter: Request Name",
      type: "string",
      hint: "Substring match against `request_name` (search_columns.request_name).",
    },
  ],
  output: [
    { key: "requests", type: "array", label: "Requests" },
    { key: "page_context", type: "object", label: "Pagination info" },
  ],

  async execute(input, ctx) {
    const pageContext = compact({
      row_count: input.rowCount ?? 25,
      start_index: input.startIndex ?? 1,
      sort_column: input.sortColumn,
      sort_order: input.sortOrder,
      search_columns: input.requestName ? { request_name: input.requestName } : undefined,
    });

    const body = await new ZohoSignClient(ctx).get("/requests", { page_context: pageContext });
    return {
      requests: unwrapResource<unknown[]>(body, "requests"),
      page_context: body.page_context ?? {},
    };
  },
};

export default action;

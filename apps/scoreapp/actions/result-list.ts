import type { ActionDefinition } from "@w6w/types";
import { ScoreAppClient, type ScoreAppPage, scorecardPath } from "../lib/client.ts";
import {
  fromDateParam,
  limitParam,
  orderByParam,
  orderDirParam,
  resultCountParam,
  scorecardParam,
  searchParam,
  statusParam,
  toDateParam,
} from "../lib/params.ts";

/**
 * `GET /scorecards/{scorecard}/results` — the results (leads) a scorecard has
 * collected, paginated.
 *
 * This is the endpoint a workflow actually harvests: each row carries `first_name`,
 * `last_name`, `email`, `status`, `created_at`, the result's `id`, the scorecard's
 * public `key` for the respondent, and `purchased`.
 *
 * `limit` is capped at 100 by the vendor, which is also its default; `meta.total`
 * alongside `links.next` is the paging signal, so a harvesting workflow reads
 * `meta.total` first and then walks `links.next` rather than guessing a page count.
 *
 * ## The filters are not interchangeable
 *
 * - `from_date` / `to_date` bound the result's creation time and take an **ISO UTC
 *   datetime** (`2024-01-01T00:00:00Z` in the vendor's own example), not a date.
 * - `status` is `started` / `finished` — a started quiz is a partial lead, which is
 *   often exactly what a follow-up workflow wants.
 * - `response_count` is `single` / `multiple` — one result can be a returning
 *   respondent's second pass, and this filter separates those.
 * - `search` matches `first_name`, `last_name` and `email` only.
 */
interface Input {
  scorecard: string;
  limit?: number;
  search?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  response_count?: string;
  order_by?: string;
  order_dir?: string;
}

const resultList: ActionDefinition<Input, ScoreAppPage<unknown>> = {
  key: "result-list",
  type: "search",
  resource: "result",
  title: "List Results",
  description: "List a scorecard's results (leads), with filters for date, status and search.",
  params: [
    scorecardParam,
    limitParam(100, "Items per page. Defaults to 100, which is also the vendor's maximum."),
    searchParam("Matches the result's first_name, last_name or email."),
    fromDateParam,
    toDateParam,
    statusParam,
    resultCountParam,
    orderByParam(
      [
        { value: "first_name", label: "First name" },
        { value: "last_name", label: "Last name" },
        { value: "email", label: "Email" },
        { value: "created_at", label: "Created at" },
        { value: "id", label: "Id" },
      ],
      "Fields the vendor documents for this endpoint.",
    ),
    orderDirParam,
  ],
  output: [
    { key: "data", type: "array", label: "Results (leads)" },
    { key: "links", type: "object", label: "First/last/prev/next page URLs" },
    { key: "meta", type: "object", label: "Page, per_page and total" },
  ],

  execute(input, ctx) {
    return new ScoreAppClient(ctx).json(`${scorecardPath(input.scorecard)}/results`, {
      query: {
        limit: input.limit,
        search: input.search,
        from_date: input.from_date,
        to_date: input.to_date,
        status: input.status,
        response_count: input.response_count,
        order_by: input.order_by,
        order_dir: input.order_dir,
      },
    });
  },
};

export default resultList;

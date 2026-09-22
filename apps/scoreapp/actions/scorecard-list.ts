import type { ActionDefinition } from "@w6w/types";
import { ScoreAppClient, type ScoreAppPage } from "../lib/client.ts";
import { limitParam, orderByParam, orderDirParam, searchParam } from "../lib/params.ts";

/**
 * `GET /scorecards` — the scorecards this account owns.
 *
 * A Laravel page-based collection: `data` is the page's rows and `links`/`meta`
 * carry the paging (this action returns both, untouched, because `meta.total`
 * and `links.next` are how a workflow decides whether to keep going).
 *
 * Each row carries `id`, `name`, `key`, `domain` and `status`. `status` is one of
 * three states and each is a real mode rather than a lifecycle stage —
 * `draft` (Draft Mode), `live` (Live/Complete) and `template` (Template) — so a
 * workflow that wants the funnels actually collecting leads filters on `live`.
 *
 * ## What is *not* here
 *
 * The documented response has no `created_at`/`updated_at` columns even though
 * `order_by` accepts them, and no counts. Any per-scorecard detail is a second
 * call (`scorecard-questions-get`, `scorecard-categories-get`, `result-list`),
 * which is the whole shape of this API: list, then read.
 */
interface Input {
  limit?: number;
  search?: string;
  status?: string;
  order_by?: string;
  order_dir?: string;
}

const scorecardList: ActionDefinition<Input, ScoreAppPage<unknown>> = {
  key: "scorecard-list",
  type: "search",
  resource: "scorecard",
  title: "List Scorecards",
  description: "List the scorecards this account owns, with their status, key and domain.",
  params: [
    limitParam(undefined, "Items per page. Defaults to 100, the vendor's own default."),
    searchParam(
      "Full-text search across the scorecard's name, key, domain and account name.",
    ),
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "live", label: "Live" },
        { value: "template", label: "Template" },
      ],
      hint: "The scorecard's mode, not a lifecycle stage: 'live' is the one collecting results.",
    },
    orderByParam(
      [
        { value: "name", label: "Name" },
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
      "Fields the vendor accepts here; the response rows do not themselves carry the timestamps.",
    ),
    orderDirParam,
  ],
  output: [
    { key: "data", type: "array", label: "Scorecards" },
    { key: "links", type: "object", label: "First/last/prev/next page URLs" },
    { key: "meta", type: "object", label: "Page, per_page and total" },
  ],

  execute(input, ctx) {
    return new ScoreAppClient(ctx).json("/scorecards", {
      query: {
        limit: input.limit,
        search: input.search,
        status: input.status,
        order_by: input.order_by,
        order_dir: input.order_dir,
      },
    });
  },
};

export default scorecardList;

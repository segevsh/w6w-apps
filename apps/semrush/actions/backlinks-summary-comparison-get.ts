import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";
import { fieldsParam, SCOPE_NO_SUBFOLDER, scopeParam } from "../lib/params.ts";

/**
 * `GET /apis/v4/backlinks/v1/comparison` — one historical series per target, side by side.
 *
 * The same monthly rows the historical summary returns, but for up to **10**
 * targets at once, so two or more domains can be plotted on one chart without
 * ten separate paid calls.
 *
 * `urls` is comma-joined on the wire, and the row set is the union of the
 * targets — `url` names which one each row belongs to. `data` is an array of
 * `{backlinks_count, domains_count, follows_count, month_date, score, url}`.
 *
 * The scope set is the three-target one: a month-by-month series has no
 * meaning for a subfolder, so `SUBFOLDER` is not accepted here.
 */
interface Input {
  urls: string[];
  scope: string;
  fields?: string[];
}

const backlinksSummaryComparisonGet: ActionDefinition<Input> = {
  key: "backlinks-summary-comparison-get",
  type: "read",
  resource: "backlinks",
  title: "Compare Backlink Summaries",
  description: "Read month-by-month backlink totals for up to 10 targets in one call.",
  params: [
    {
      key: "urls",
      label: "Targets",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "example.com" },
      hint: "Up to 10 domains, subdomains or URLs. Commas are added on the wire; each row " +
        "comes back tagged with the `url` it belongs to.",
    },
    scopeParam(SCOPE_NO_SUBFOLDER),
    fieldsParam,
  ],
  output: [{ key: "data", type: "array", label: "One row per month per target" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/comparison", {
        query: { urls: input.urls, scope: input.scope, fields: input.fields },
      });
    return { data: data ?? [] };
  },
};

export default backlinksSummaryComparisonGet;

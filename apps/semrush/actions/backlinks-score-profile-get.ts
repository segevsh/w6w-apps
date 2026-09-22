import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";
import { SCOPE_FULL, scopeParam } from "../lib/params.ts";

/**
 * `GET /apis/v4/backlinks/v1/score-profile` — the domain-score distribution of a target's referrers.
 *
 * One row per score bucket, so the whole report is at most 101 rows and needs no
 * paging. It is the shape to plot when judging link quality: a profile skewed
 * towards low-score referrers reads very differently from one with a tail of
 * high-score domains, even when the total backlink count is identical.
 *
 * This endpoint takes **only** `url` and `scope` — the v4 reference documents
 * no `fields`, `order_by`, `limit`, `offset` or `filter` for it, and the row set
 * is fixed by the score range rather than by a query.
 *
 * `data` is an array of `{domain_score, domains_count}`.
 */
interface Input {
  url: string;
  scope: string;
}

const backlinksScoreProfileGet: ActionDefinition<Input> = {
  key: "backlinks-score-profile-get",
  type: "read",
  resource: "backlinks",
  title: "Get Referring Domain Score Profile",
  description: "Read the distribution of referring domains across the 0-100 domain score range.",
  params: [
    {
      key: "url",
      label: "Target",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "A domain, subdomain, subfolder or exact URL — `scope` says which one is meant.",
    },
    scopeParam(SCOPE_FULL),
  ],
  output: [{ key: "data", type: "array", label: "One row per domain-score bucket" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/score-profile", {
        query: { url: input.url, scope: input.scope },
      });
    return { data: data ?? [] };
  },
};

export default backlinksScoreProfileGet;

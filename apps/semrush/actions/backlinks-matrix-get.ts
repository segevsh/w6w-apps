import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";
import {
  directionParam,
  filterParam,
  limitParam,
  offsetParam,
  orderByParam,
  SCOPE_NO_SUBFOLDER,
  scopeParam,
} from "../lib/params.ts";

/**
 * `GET /apis/v4/backlinks/v1/matrix` — referring domains, with a count per target.
 *
 * The "who links to whom" grid: one row per referring domain, and a
 * `backlinks_counts` array holding that domain's link count for **each** target
 * in the order they were passed. A row where one target has links and another
 * has none is a link source one site has and the other is missing — the shape to
 * scan when looking for link-building targets.
 *
 * Up to **6** targets, fewer than the comparison endpoint's 10, because the
 * response grows with the square of the target count.
 *
 * `data` is an array of `{backlinks_counts, country, domain, domain_score,
 * ip_address, matches_count}`. There is no `format` parameter on this endpoint
 * — the v4 reference documents JSON only — so none is exposed here either.
 */
interface Input {
  urls: string[];
  scope: string;
  order_by?: string;
  direction?: string;
  limit?: number;
  offset?: number;
  filter?: string;
}

const backlinksMatrixGet: ActionDefinition<Input> = {
  key: "backlinks-matrix-get",
  type: "read",
  resource: "backlinks",
  title: "Get Backlink Matrix",
  description: "List referring domains with a per-target link count, for up to 6 targets.",
  params: [
    {
      key: "urls",
      label: "Targets",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "example.com" },
      hint: "Up to 6 domains, subdomains or URLs. The order set here is the order the " +
        "`backlinks_counts` array comes back in.",
    },
    scopeParam(SCOPE_NO_SUBFOLDER),
    orderByParam(),
    directionParam,
    limitParam(100),
    offsetParam,
    filterParam,
  ],
  output: [{ key: "data", type: "array", label: "Referring domains, with per-target counts" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/matrix", {
        query: {
          urls: input.urls,
          scope: input.scope,
          order_by: input.order_by,
          direction: input.direction,
          limit: input.limit,
          offset: input.offset,
          filter: input.filter,
        },
      });
    return { data: data ?? [] };
  },
};

export default backlinksMatrixGet;

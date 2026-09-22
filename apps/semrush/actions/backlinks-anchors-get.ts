import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";
import {
  directionParam,
  fieldsParam,
  filterParam,
  limitParam,
  offsetParam,
  orderByParam,
  SCOPE_FULL,
  scopeParam,
} from "../lib/params.ts";

/**
 * `GET /apis/v4/backlinks/v1/anchors` — the anchor texts used to link to a target.
 *
 * The anchor profile is how search engines read a link's intent, so this is the
 * report to reach for when an exact-match anchor looks over-optimised — or when
 * a brand term is missing from it.
 *
 * `data` is an array of `{anchor, backlinks_count, domains_count, first_seen_at,
 * last_seen_at}`. Rows default to the anchors with the most referring domains
 * first (`order_by=domains_count`, `direction=DESC`).
 */
interface Input {
  url: string;
  scope: string;
  fields?: string[];
  order_by?: string;
  direction?: string;
  limit?: number;
  offset?: number;
  filter?: string;
}

const backlinksAnchorsGet: ActionDefinition<Input> = {
  key: "backlinks-anchors-get",
  type: "read",
  resource: "backlinks",
  title: "Get Anchor Texts",
  description: "List the anchor texts pointing at a target, with link and domain counts.",
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
    fieldsParam,
    orderByParam("domains_count"),
    directionParam,
    limitParam(100),
    offsetParam,
    filterParam,
  ],
  output: [{ key: "data", type: "array", label: "Anchors, one row per anchor text" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/anchors", {
        query: {
          url: input.url,
          scope: input.scope,
          fields: input.fields,
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

export default backlinksAnchorsGet;

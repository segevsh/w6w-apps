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
 * `GET /apis/v4/backlinks/v1/ref-domains` — the domains that link to a target.
 *
 * The deduplicated view of a backlink profile: one row per referring domain
 * rather than per link, which is what "how many sites link to me" actually
 * means.
 *
 * `data` is an array of `{backlinks_count, country, domain, domain_score,
 * first_seen_at, ip_address, is_follow, is_lost, is_new, last_seen_at}`. Rows
 * default to the most-linked domains first (`order_by=backlinks_count`,
 * `direction=DESC`).
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

const backlinksReferringDomainsGet: ActionDefinition<Input> = {
  key: "backlinks-referring-domains-get",
  type: "read",
  resource: "backlinks",
  title: "Get Referring Domains",
  description: "List the domains linking to a target, with per-domain counts and first-seen dates.",
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
    orderByParam("backlinks_count"),
    directionParam,
    limitParam(100),
    offsetParam,
    filterParam,
  ],
  output: [{ key: "data", type: "array", label: "Referring domains, one row per domain" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/ref-domains", {
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

export default backlinksReferringDomainsGet;

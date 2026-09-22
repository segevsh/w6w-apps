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
 * `GET /apis/v4/backlinks/v1/ref-ips` — the IP addresses that link to a target.
 *
 * The same deduplication as referring domains, one level lower: several domains
 * can share one host, so an IP view shows whose infrastructure a profile
 * actually depends on. It is the quickest way to see a network of linked sites
 * that all sit on one server.
 *
 * `data` is an array of `{backlinks_count, country, domains_count,
 * first_seen_at, ip_address, last_seen_at}`. Rows default to the IPs with the
 * most referring domains first (`order_by=domains_count`, `direction=DESC`).
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

const backlinksReferringIpsGet: ActionDefinition<Input> = {
  key: "backlinks-referring-ips-get",
  type: "read",
  resource: "backlinks",
  title: "Get Referring IPs",
  description: "List the IP addresses linking to a target, with domain counts and locations.",
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
  output: [{ key: "data", type: "array", label: "Referring IPs, one row per address" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/ref-ips", {
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

export default backlinksReferringIpsGet;

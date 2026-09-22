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
 * `GET /apis/v4/backlinks/v1/pages` — the target's own pages that are linked to.
 *
 * The reverse of the referring-domains view: instead of "who links to me", this
 * is "which of my pages earn links", which is what a content or internal-linking
 * decision actually needs.
 *
 * `data` is an array of `{backlinks_count, domains_count, external_links_count,
 * first_seen_at, internal_links_count, last_seen_at, response_code,
 * source_title, source_url}`. Rows default to the pages with the most referring
 * domains first (`order_by=domains_count`, `direction=DESC`).
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

const backlinksPagesGet: ActionDefinition<Input> = {
  key: "backlinks-pages-get",
  type: "read",
  resource: "backlinks",
  title: "Get Linked Pages",
  description: "List the target's own pages that receive backlinks, with per-page link counts.",
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
  output: [{ key: "data", type: "array", label: "Linked pages, one row per page" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/pages", {
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

export default backlinksPagesGet;

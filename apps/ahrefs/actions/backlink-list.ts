import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  target: string;
  select?: string;
  where?: string;
  orderBy?: string;
  limit?: number;
  history?: string;
  aggregation?: string;
  mode?: string;
  protocol?: string;
}
const DEFAULT_SELECT =
  "url_from,url_to,anchor,domain_rating_source,url_rating_source,first_seen_link,last_visited,is_dofollow";
/** `GET /site-explorer/all-backlinks` — response key `backlinks`. */
const backlinkList: ActionDefinition<Input> = {
  key: "backlink-list",
  type: "read",
  resource: "backlink",
  title: "List Backlinks",
  description: "List the backlinks pointing at a target.",
  params: [
    {
      key: "target",
      label: "Target",
      type: "string",
      required: true,
      hint: "The domain or URL to analyse, e.g. `example.com` or `example.com/blog/`.",
    },
    {
      key: "select",
      label: "Columns",
      type: "string",
      hint:
        "Comma-separated columns to return. Each extra column adds API units. Default: `url_from,url_to,anchor,domain_rating_source,url_rating_source,first_seen_link,last_visited,is_dofollow`.",
    },
    {
      key: "where",
      label: "Filter",
      type: "string",
      hint:
        'Optional Ahrefs filter expression (JSON text), e.g. `{"field":"is_dofollow","is":["eq",1]}`. See Ahrefs \'Filter syntax\'.',
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      hint: "A column, optionally with direction, e.g. `traffic:desc`.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint:
        "Maximum rows to return. Ahrefs has no offset: limit is the only paging control, and every row costs units.",
      validation: { min: 1, integer: true },
    },
    {
      key: "history",
      label: "History",
      type: "string",
      hint:
        "`live`, `since:YYYY-MM-DD`, or `all_time` (Ahrefs' default) \u2014 whether lost links are included.",
    },
    {
      key: "aggregation",
      label: "Grouping",
      type: "select",
      hint: "Backlink grouping mode. Omit for Ahrefs' default.",
      options: [{ value: "similar_links", label: "Similar links" }, {
        value: "1_per_domain",
        label: "One per domain",
      }, { value: "all", label: "All" }],
    },
    {
      key: "mode",
      label: "Scope",
      type: "select",
      hint: "How the target is matched. Omit for Ahrefs' default (`subdomains`).",
      options: [{ value: "exact", label: "Exact URL" }, { value: "prefix", label: "Path prefix" }, {
        value: "domain",
        label: "Domain (no subdomains)",
      }, { value: "subdomains", label: "Domain and subdomains" }],
    },
    {
      key: "protocol",
      label: "Protocol",
      type: "select",
      hint: "Which protocol of the target to include. Omit for `both`.",
      options: [{ value: "both", label: "Both" }, { value: "http", label: "HTTP" }, {
        value: "https",
        label: "HTTPS",
      }],
    },
  ],
  output: [
    { key: "backlinks", type: "array", label: "Backlinks" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-explorer/all-backlinks", {
      target: input.target,
      select: input.select ?? DEFAULT_SELECT,
      where: input.where,
      order_by: input.orderBy,
      limit: input.limit,
      history: input.history,
      aggregation: input.aggregation,
      mode: input.mode,
      protocol: input.protocol,
    });
  },
};

export default backlinkList;

import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  target: string;
  select?: string;
  where?: string;
  orderBy?: string;
  limit?: number;
  history?: string;
  mode?: string;
  protocol?: string;
}
const DEFAULT_SELECT =
  "domain,domain_rating,links_to_target,dofollow_links,first_seen,last_seen,traffic_domain";
/** `GET /site-explorer/refdomains` — response key `refdomains`. */
const referringDomainList: ActionDefinition<Input> = {
  key: "referring-domain-list",
  type: "read",
  resource: "domain",
  title: "List Referring Domains",
  description: "List the domains that link to a target.",
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
        "Comma-separated columns to return. Each extra column adds API units. Default: `domain,domain_rating,links_to_target,dofollow_links,first_seen,last_seen,traffic_domain`.",
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
    { key: "refdomains", type: "array", label: "Referring domains" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-explorer/refdomains", {
      target: input.target,
      select: input.select ?? DEFAULT_SELECT,
      where: input.where,
      order_by: input.orderBy,
      limit: input.limit,
      history: input.history,
      mode: input.mode,
      protocol: input.protocol,
    });
  },
};

export default referringDomainList;

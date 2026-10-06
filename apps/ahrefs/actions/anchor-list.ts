import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  target: string;
  select?: string;
  where?: string;
  orderBy?: string;
  limit?: number;
  mode?: string;
  protocol?: string;
}
const DEFAULT_SELECT =
  "anchor,links_to_target,refdomains,refpages,first_seen,last_seen,top_domain_rating";
/** `GET /site-explorer/anchors` — response key `anchors`. */
const anchorList: ActionDefinition<Input> = {
  key: "anchor-list",
  type: "read",
  resource: "backlink",
  title: "List Anchors",
  description: "List the anchor texts used in links to a target.",
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
        "Comma-separated columns to return. Each extra column adds API units. Default: `anchor,links_to_target,refdomains,refpages,first_seen,last_seen,top_domain_rating`.",
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
    { key: "anchors", type: "array", label: "Anchor texts" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-explorer/anchors", {
      target: input.target,
      select: input.select ?? DEFAULT_SELECT,
      where: input.where,
      order_by: input.orderBy,
      limit: input.limit,
      mode: input.mode,
      protocol: input.protocol,
    });
  },
};

export default anchorList;

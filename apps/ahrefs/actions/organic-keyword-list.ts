import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient, country } from "../lib/client.ts";

interface Input {
  target: string;
  date: string;
  country?: string;
  select?: string;
  where?: string;
  orderBy?: string;
  limit?: number;
  mode?: string;
  protocol?: string;
  dateCompared?: string;
  volumeMode?: string;
  trafficMode?: string;
}
const DEFAULT_SELECT =
  "keyword,best_position,best_position_url,volume,keyword_difficulty,sum_traffic,cpc";
/** `GET /site-explorer/organic-keywords` — response key `keywords`. */
const organicKeywordList: ActionDefinition<Input> = {
  key: "organic-keyword-list",
  type: "read",
  resource: "keyword",
  title: "List Organic Keywords",
  description: "List the keywords a target ranks for in organic search.",
  params: [
    {
      key: "target",
      label: "Target",
      type: "string",
      required: true,
      hint: "The domain or URL to analyse, e.g. `example.com` or `example.com/blog/`.",
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      hint: "Report date, `YYYY-MM-DD`.",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint:
        "Two-letter ISO 3166-1 country code, e.g. `us`. Omit to sum across all countries (where optional).",
    },
    {
      key: "select",
      label: "Columns",
      type: "string",
      hint:
        "Comma-separated columns to return. Each extra column adds API units. Default: `keyword,best_position,best_position_url,volume,keyword_difficulty,sum_traffic,cpc`.",
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
    {
      key: "dateCompared",
      label: "Compare date",
      type: "string",
      hint: "Optional `YYYY-MM-DD` to compare metrics against.",
    },
    {
      key: "volumeMode",
      label: "Volume mode",
      type: "select",
      hint: "How search volume is calculated. Omit for Ahrefs' default.",
      options: [{ value: "monthly", label: "Monthly" }, { value: "average", label: "Average" }],
    },
    {
      key: "trafficMode",
      label: "Traffic mode",
      type: "select",
      hint: "How organic traffic is calculated. Omit for Ahrefs' default.",
      options: [{ value: "static", label: "Static" }, { value: "adaptive", label: "Adaptive" }],
    },
  ],
  output: [
    { key: "keywords", type: "array", label: "Ranking keywords" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-explorer/organic-keywords", {
      target: input.target,
      date: input.date,
      country: country(input.country),
      select: input.select ?? DEFAULT_SELECT,
      where: input.where,
      order_by: input.orderBy,
      limit: input.limit,
      mode: input.mode,
      protocol: input.protocol,
      date_compared: input.dateCompared,
      volume_mode: input.volumeMode,
      traffic_mode: input.trafficMode,
    });
  },
};

export default organicKeywordList;

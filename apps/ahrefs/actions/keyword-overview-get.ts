import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient, country } from "../lib/client.ts";

interface Input {
  country: string;
  keywords?: string;
  select?: string;
  where?: string;
  orderBy?: string;
  limit?: number;
}
const DEFAULT_SELECT = "keyword,volume,difficulty,cpc,traffic_potential,global_volume,parent_topic";
/** `GET /keywords-explorer/overview` — response key `keywords`. */
const keywordOverviewGet: ActionDefinition<Input> = {
  key: "keyword-overview-get",
  type: "read",
  resource: "keyword",
  title: "Get Keyword Overview",
  description: "Search volume, difficulty, CPC and traffic potential for keywords in a country.",
  params: [
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      hint:
        "Two-letter ISO 3166-1 country code, e.g. `us`. Omit to sum across all countries (where optional).",
    },
    {
      key: "keywords",
      label: "Keywords",
      type: "string",
      hint: "Comma-separated keywords, e.g. `seo tools, backlink checker`.",
    },
    {
      key: "select",
      label: "Columns",
      type: "string",
      hint:
        "Comma-separated columns to return. Each extra column adds API units. Default: `keyword,volume,difficulty,cpc,traffic_potential,global_volume,parent_topic`.",
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
  ],
  output: [
    { key: "keywords", type: "array", label: "Keyword metrics" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/keywords-explorer/overview", {
      country: country(input.country),
      keywords: input.keywords,
      select: input.select ?? DEFAULT_SELECT,
      where: input.where,
      order_by: input.orderBy,
      limit: input.limit,
    });
  },
};

export default keywordOverviewGet;

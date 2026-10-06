import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient, country } from "../lib/client.ts";

interface Input {
  country: string;
  keywords?: string;
  select?: string;
  where?: string;
  orderBy?: string;
  limit?: number;
  terms?: string;
  viewFor?: string;
}
const DEFAULT_SELECT = "keyword,volume,difficulty,cpc,traffic_potential,global_volume,parent_topic";
/** `GET /keywords-explorer/related-terms` — response key `keywords`. */
const keywordRelatedTermList: ActionDefinition<Input> = {
  key: "keyword-related-term-list",
  type: "read",
  resource: "keyword",
  title: "List Related Terms",
  description: "Keywords that top-ranking pages for the seed keywords also rank for.",
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
    {
      key: "terms",
      label: "Terms",
      type: "select",
      hint: "Which ideas to return.",
      options: [{ value: "all", label: "All" }],
    },
    {
      key: "viewFor",
      label: "View for",
      type: "select",
      hint: "Rank the top 10 or top 100 pages.",
      options: [{ value: "top_10", label: "Top 10" }, { value: "top_100", label: "Top 100" }],
    },
  ],
  output: [
    { key: "keywords", type: "array", label: "Related keywords" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/keywords-explorer/related-terms", {
      country: country(input.country),
      keywords: input.keywords,
      select: input.select ?? DEFAULT_SELECT,
      where: input.where,
      order_by: input.orderBy,
      limit: input.limit,
      terms: input.terms,
      view_for: input.viewFor,
    });
  },
};

export default keywordRelatedTermList;

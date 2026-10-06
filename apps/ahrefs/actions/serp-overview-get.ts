import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient, country } from "../lib/client.ts";

interface Input {
  keyword: string;
  country: string;
  select?: string;
  topPositions?: number;
}
const DEFAULT_SELECT =
  "position,url,title,type,domain_rating,url_rating,backlinks,refdomains,traffic,value";
/** `GET /serp-overview/serp-overview` — response key `positions`. */
const serpOverviewGet: ActionDefinition<Input> = {
  key: "serp-overview-get",
  type: "read",
  resource: "serp",
  title: "Get SERP Overview",
  description: "The live search results for a keyword, with each result's rating and traffic.",
  params: [
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      required: true,
      hint: "The keyword to return the SERP for.",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      hint:
        "Two-letter ISO 3166-1 country code, e.g. `us`. Omit to sum across all countries (where optional).",
    },
    {
      key: "select",
      label: "Columns",
      type: "string",
      hint:
        "Comma-separated columns to return. Each extra column adds API units. Default: `position,url,title,type,domain_rating,url_rating,backlinks,refdomains,traffic,value`.",
    },
    {
      key: "topPositions",
      label: "Top positions",
      type: "number",
      hint: "How many top organic positions to return. Omit for all available.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "positions", type: "array", label: "SERP positions" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/serp-overview/serp-overview", {
      keyword: input.keyword,
      country: country(input.country),
      select: input.select ?? DEFAULT_SELECT,
      top_positions: input.topPositions,
    });
  },
};

export default serpOverviewGet;

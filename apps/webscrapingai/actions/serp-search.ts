import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, WsaiClient } from "../lib/client.ts";

interface Input {
  q: string;
  gl?: string;
  hl?: string;
  page?: number;
}

const serpSearch: ActionDefinition<Input> = {
  key: "serp-search",
  type: "search",
  resource: "search",
  title: "Search Google",
  description: "Parsed Google search results (organic results, related searches, pagination).",
  params: [
    { key: "q", label: "Query", type: "string", required: true, placeholder: "coffee machines" },
    {
      key: "gl",
      label: "Country code",
      type: "string",
      placeholder: "us",
      hint: "Two-letter country for geolocation (Google `gl`, vendor default us).",
    },
    {
      key: "hl",
      label: "Language code",
      type: "string",
      placeholder: "en",
      hint: "Two-letter language for the results (Google `hl`, vendor default en).",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Results page, 10 per page, 1 to 100.",
    },
  ],
  output: [
    { key: "search_parameters", type: "object", label: "Normalized search parameters" },
    { key: "search_information", type: "object", label: "Query displayed and result state" },
    { key: "organic_results", type: "array", label: "Organic results in rank order" },
    { key: "related_searches", type: "array", label: "Related searches" },
    { key: "pagination", type: "object", label: "Current and next page" },
  ],

  async execute(input, ctx) {
    return await new WsaiClient(ctx).json(
      "/serp",
      compact({
        q: requireText(input.q, "Query"),
        engine: "google",
        gl: input.gl?.trim().toLowerCase(),
        hl: input.hl?.trim().toLowerCase(),
        page: input.page,
      }),
    );
  },
};

export default serpSearch;

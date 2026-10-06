import type { ActionDefinition } from "@w6w/types";
import { parseJson, ProspeoClient } from "../lib/client.ts";

interface Input {
  filters: unknown;
  page?: number;
}

const searchPerson: ActionDefinition<Input> = {
  key: "search-person",
  type: "search",
  resource: "person",
  title: "Search People",
  description:
    "Search Prospeo's contact database with 20+ person and company filters (POST /search-person). Results carry NO email or mobile: pass each person_id to Enrich Person or Bulk Enrich Persons to reveal them. 25 results per page, at most 1000 pages. 1 credit per page that returns results (free if the same page was bought in the last 30 days). Returns an empty `results` list on NO_RESULTS.",
  params: [
    {
      key: "filters",
      label: "Filters",
      type: "json",
      required: true,
      hint:
        'The API\'s filter object, e.g. {"company_industry":{"include":["Software Development"]}}. At least one positive filter is required (exclude-only is rejected). Use Search Suggestions to find exact values.',
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { min: 1, max: 1000, integer: true },
    },
  ],
  output: [
    { key: "results", type: "array", label: "{ person, company } per result" },
    { key: "pagination", type: "object", label: "current_page, per_page, total_page, total_count" },
    { key: "free", type: "boolean", label: "True if no credit was charged (deduplicated)" },
  ],

  async execute(input, ctx) {
    const filters = parseJson(input.filters, "filters");
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
      throw new Error("filters must be an object");
    }
    const body = await new ProspeoClient(ctx).call<Record<string, unknown>>("/search-person", {
      body: { filters, page: input.page ?? 1 },
      soft: ["NO_RESULTS"],
    });
    if (body.error === true) return { results: [], pagination: null, free: true };
    return { results: body.results ?? [], pagination: body.pagination, free: body.free };
  },
};

export default searchPerson;

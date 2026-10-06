import type { ActionDefinition } from "@w6w/types";
import { asList, asOptionalJson, call, compact, toInt } from "../lib/client.ts";

interface Input {
  filters?: unknown;
  conjunction?: unknown;
  itemsPerPage?: unknown;
  currentPage?: unknown;
  includeCount?: unknown;
}

const candidateSearch: ActionDefinition<Input> = {
  key: "candidate-search",
  type: "search",
  title: "Search Candidates",
  description:
    "Search candidates with the filters documented in Recruiterflow's Candidate Search guide.",
  params: [
    {
      key: "filters",
      label: "Filters",
      type: "json",
      required: true,
      hint:
        'JSON array of filter objects ({"key", "filter_type", ...}); see Recruiterflow\'s "Candidate Search" PDF linked from the API reference.',
    },
    {
      key: "conjunction",
      label: "Conjunction",
      type: "select",
      required: true,
      hint: "How filters combine.",
      options: [{ value: "and", label: "All filters (and)" }, {
        value: "or",
        label: "Any filter (or)",
      }],
      default: "and",
    },
    { key: "itemsPerPage", label: "Items per page", type: "number", required: true, default: 20 },
    { key: "currentPage", label: "Page", type: "number", required: true, default: 1 },
    { key: "includeCount", label: "Include total count", type: "boolean" },
  ],
  output: [{ key: "items", type: "array", label: "Records" }, {
    key: "total",
    type: "number",
    label: "Total (with include_count)",
  }],

  async execute(input, ctx) {
    const body = compact({
      "filters": asOptionalJson(input.filters, "Filters"),
      "conjunction": input.conjunction ?? "and",
      "items_per_page": String(toInt(input.itemsPerPage, "Items per page") ?? 20),
      "current_page": String(toInt(input.currentPage, "Page") ?? 1),
      "include_count": input.includeCount,
    });
    const res = await call(ctx, "/candidate/search", { method: "POST", body });
    return asList(res);
  },
};

export default candidateSearch;

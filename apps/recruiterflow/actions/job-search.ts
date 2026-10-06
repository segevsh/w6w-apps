import type { ActionDefinition } from "@w6w/types";
import { asList, asOptionalJson, call, compact, toInt } from "../lib/client.ts";

interface Input {
  filters?: unknown;
  conjunction?: unknown;
  itemsPerPage?: unknown;
  currentPage?: unknown;
  includeCount?: unknown;
  includeDescription?: unknown;
}

const jobSearch: ActionDefinition<Input> = {
  key: "job-search",
  type: "search",
  title: "Search Jobs",
  description: "Search jobs with the filters documented in Recruiterflow's Job Search guide.",
  params: [
    {
      key: "filters",
      label: "Filters",
      type: "json",
      required: true,
      hint:
        'JSON array of filter objects; see Recruiterflow\'s "Job Search" PDF linked from the API reference.',
    },
    {
      key: "conjunction",
      label: "Conjunction",
      type: "select",
      options: [{ value: "and", label: "All filters (and)" }, {
        value: "or",
        label: "Any filter (or)",
      }],
      default: "and",
    },
    { key: "itemsPerPage", label: "Items per page", type: "number", default: 20 },
    { key: "currentPage", label: "Page", type: "number", default: 1 },
    { key: "includeCount", label: "Include total count", type: "boolean" },
    { key: "includeDescription", label: "Include description", type: "boolean" },
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
      "items_per_page": toInt(input.itemsPerPage, "Items per page") ?? 20,
      "current_page": toInt(input.currentPage, "Page") ?? 1,
      "include_count": input.includeCount,
      "include_description": input.includeDescription,
    });
    const res = await call(ctx, "/job/search", { method: "POST", body });
    return asList(res);
  },
};

export default jobSearch;

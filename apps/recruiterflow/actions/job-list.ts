import type { ActionDefinition } from "@w6w/types";
import { asList, call, compact, flag, type QueryValue, toInt } from "../lib/client.ts";

interface Input {
  itemsPerPage?: unknown;
  currentPage?: unknown;
  includeCount?: unknown;
  onlyOpen?: unknown;
  includeDescription?: unknown;
  includeNotes?: unknown;
}

const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "read",
  title: "List Jobs",
  description: "List jobs in the account.",
  params: [
    { key: "itemsPerPage", label: "Items per page", type: "number", hint: "Records per page." },
    { key: "currentPage", label: "Page", type: "number", hint: "1-based page number." },
    {
      key: "includeCount",
      label: "Include total count",
      type: "boolean",
      hint: "Adds the total record count to the result.",
    },
    { key: "onlyOpen", label: "Only open jobs", type: "boolean" },
    { key: "includeDescription", label: "Include description", type: "boolean" },
    { key: "includeNotes", label: "Include notes", type: "boolean" },
  ],
  output: [{ key: "items", type: "array", label: "Records" }, {
    key: "total",
    type: "number",
    label: "Total (with include_count)",
  }],

  async execute(input, ctx) {
    const query = compact({
      "items_per_page": toInt(input.itemsPerPage, "Items per page"),
      "current_page": toInt(input.currentPage, "Page"),
      "include_count": flag(input.includeCount),
      "only_open": flag(input.onlyOpen),
      "include_description": flag(input.includeDescription),
      "include_notes": flag(input.includeNotes),
    }) as Record<string, QueryValue>;
    const res = await call(ctx, "/job/list", { query });
    return asList(res);
  },
};

export default jobList;

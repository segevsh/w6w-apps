import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  page?: number;
  pageSize?: number;
}

/**
 * `GET /api/v1/custom-reports` — the saved reports in this company.
 *
 * The discovery half of the reporting pair: it returns the report IDs that Get
 * Report executes. Reports are built in the BambooHR UI, so this is how an
 * automation finds one by name without hard-coding a number someone can change.
 *
 * Paging is documented as `page` (default 1, "out-of-range values are clamped to
 * the nearest valid page") and `page_size` (default 500, maximum 1000).
 */
const listReports: ActionDefinition<Input> = {
  key: "list-reports",
  type: "search",
  resource: "report",
  title: "List Reports",
  description:
    "List the company's saved reports, with their IDs. Use an ID with Get Report to run one.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Defaults to 1. Out-of-range values are clamped to the nearest valid page.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Records per page (`page_size`). Defaults to 500, maximum 1000.",
    },
  ],
  output: [{ key: "reports", type: "array", label: "Saved reports" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request("/custom-reports", {
      query: { page: input.page, page_size: input.pageSize },
    });
  },
};

export default listReports;

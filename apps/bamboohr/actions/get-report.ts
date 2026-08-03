import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  reportId: number;
  page?: number;
  pageSize?: number;
}

/**
 * `GET /api/v1/custom-reports/{reportId}` — run a saved report.
 *
 * The execution half of the reporting pair. This is often the most practical way
 * to get a wide, filtered slice of employee data out of BambooHR: the report is
 * built once in the UI, where columns and filters are easy to express, and this
 * action just runs it — no `fields` list to assemble, no per-endpoint field
 * vocabulary to get right.
 *
 * `reportId` is documented as an INTEGER ("The numeric ID of the saved custom
 * report to execute"), so the param is typed `number` rather than the string
 * used for employee IDs. Paging matches List Reports: `page` defaults to 1,
 * `page_size` to 500 with a maximum of 1000.
 */
const getReport: ActionDefinition<Input> = {
  key: "get-report",
  type: "read",
  resource: "report",
  title: "Get Report",
  description:
    "Run a saved report by ID and return its rows. Often the simplest way to extract a wide, " +
    "pre-filtered slice of employee data, since the columns are chosen in the BambooHR UI.",
  params: [
    {
      key: "reportId",
      label: "Report ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The numeric report ID, from the List Reports action.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Defaults to 1.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Records per page (`page_size`). Defaults to 500, maximum 1000.",
    },
  ],
  output: [{ key: "rows", type: "array", label: "Report rows" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request(
      `/custom-reports/${encodeURIComponent(String(input.reportId))}`,
      { query: { page: input.page, page_size: input.pageSize } },
    );
  },
};

export default getReport;

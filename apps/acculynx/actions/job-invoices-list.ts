import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  jobId: string;
  pageSize?: number;
  startIndex?: number;
  sortOrder?: string;
}

const action: ActionDefinition<Input> = {
  key: "job-invoices-list",
  type: "read",
  resource: "invoice",
  title: "List Job Invoices",
  description: "List a job's invoices with state, totals and balance due.",
  params: [
    idParam("jobId", "Job id"),
    ...pagingParams(),
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      advanced: true,
      options: [{ value: "Ascending", label: "Ascending" }, {
        value: "Descending",
        label: "Descending",
      }],
    },
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(`/jobs/${encodeId(input.jobId)}/invoices`, {
      ...pageQuery(input, "pageStartIndex"),
      sortOrder: input.sortOrder,
    });
  },
};

export default action;

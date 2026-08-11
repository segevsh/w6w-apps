import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput } from "../lib/params.ts";

/**
 * `GET /jobs/{job_id}/line_items` — every line item on a job.
 *
 * One of the endpoints with no pagination envelope at all: it answers
 * `{url, data: [...]}`, so `page`, `pageSize`, `totalPages` and `totalItems` come
 * back undefined here. That is the vendor's shape, not a gap in this action.
 */
interface Input {
  jobId: string;
  companyId?: string;
}

const jobLineItemList: ActionDefinition<Input, NormalizedList> = {
  key: "job-line-item-list",
  type: "read",
  resource: "job",
  title: "List Job Line Items",
  description:
    "List every line item on a job. Unpaginated — the whole list comes back in one call. Prices " +
    "and costs are integers in cents.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    companyIdParam,
  ],
  output: listOutput("Line items"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list(
      `/jobs/${encodeId(input.jobId)}/line_items`,
      "line_items",
      { companyId: input.companyId },
    );
  },
};

export default jobLineItemList;

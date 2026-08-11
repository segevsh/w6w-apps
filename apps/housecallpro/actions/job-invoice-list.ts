import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput } from "../lib/params.ts";

/**
 * `GET /jobs/{job_id}/invoices` — the invoices raised against one job.
 *
 * Unpaginated, like the other job sub-resources. A job may carry several
 * invoices when its total is split across progress invoices, which is what
 * `invoiced_amount` on each line item (added 2026-06-15) apportions.
 */
interface Input {
  jobId: string;
  companyId?: string;
}

const jobInvoiceList: ActionDefinition<Input, NormalizedList> = {
  key: "job-invoice-list",
  type: "read",
  resource: "invoice",
  title: "List Job Invoices",
  description:
    "List the invoices for a job. Amounts are integers in cents. A job split across progress " +
    "invoices returns several.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    companyIdParam,
  ],
  output: listOutput("Invoices"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list(
      `/jobs/${encodeId(input.jobId)}/invoices`,
      "invoices",
      { companyId: input.companyId },
    );
  },
};

export default jobInvoiceList;

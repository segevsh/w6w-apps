import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /jobs/{job_id}` — one job, with its rolled-up financials.
 *
 * There is no `GET /jobs` list on this API: a job is readable one id at a time,
 * and the way to find ids is `search-records` with `search_view: "jobs"`. The
 * response carries both the planned totals and the logged/invoiced actuals, in
 * the job's own currency.
 */
interface Input {
  jobId: number;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description:
    "Fetch one job by id — status, company, lead, rates and its planned, logged and invoiced " +
    "totals in the job's currency.",
  params: [idParam("jobId", "Job ID", "Ids come from a search over `jobs`.")],
  output: [
    { key: "id", type: "number", label: "Job ID" },
    { key: "name", type: "string", label: "Job name" },
    { key: "fullName", type: "string", label: "Full job name" },
    { key: "companyId", type: "number", label: "Company ID" },
    { key: "jobStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "isBillable", type: "boolean", label: "Is the job billable" },
    { key: "rateCardId", type: "number", label: "Rate card ID" },
    { key: "estimatedStartDate", type: "string", label: "Estimated start date" },
    { key: "estimatedEndDate", type: "string", label: "Estimated end date" },
    { key: "totalPlannedMinutes", type: "number", label: "Total planned minutes" },
    { key: "totalLoggedMinutes", type: "number", label: "Total logged minutes" },
    { key: "totalLoggedExTax", type: "number", label: "Total logged ex tax" },
    { key: "totalInvoicedExTax", type: "number", label: "Total invoiced ex tax" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/jobs/${encodeId(input.jobId)}`);
  },
};

export default jobGet;

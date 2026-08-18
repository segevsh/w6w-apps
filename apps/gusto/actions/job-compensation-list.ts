import type { ActionDefinition } from "@w6w/types";
import { GustoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/jobs/{job_id}/compensations` — a job's pay history.
 *
 * Gusto's model has three levels and skipping one is the usual mistake: an
 * **employee** holds one or more **jobs**, and a job holds a series of
 * **compensations**, each with its own `effective_date`. A raise is a new
 * compensation on the same job, not an edit — which is why "what does this
 * person earn" is a question about the *latest* compensation on their *primary*
 * job, and why the history is here rather than on the employee.
 *
 * `payment_unit` is what makes the number meaningful — `Hour`, `Week`, `Month`,
 * `Year` or `Paycheck` — and annualising without reading it is how a rate of
 * `4000` becomes either a good salary or a very bad one.
 *
 * `flsa_status` marks whether the job is overtime-eligible, which is a legal
 * classification rather than a preference.
 */
const action: ActionDefinition = {
  key: "job-compensation-list",
  type: "read",
  resource: "compensation",
  title: "List a job's compensations",
  description:
    "A job's pay history — a raise is a new compensation with an effective date, not an edit. " +
    "Read `payment_unit` before annualising anything.",
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "string",
      required: true,
      default: "",
      hint: "From an employee's `jobs` — read the employee with `include=all_compensations` to " +
        "get both at once.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "uuid", type: "string", label: "Compensation UUID" },
    { key: "rate", type: "string", label: "Rate" },
    { key: "payment_unit", type: "string", label: "Payment unit" },
    { key: "flsa_status", type: "string", label: "FLSA status" },
    { key: "effective_date", type: "string", label: "Effective date" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobId = String(p.jobId ?? "").trim();
    if (!jobId) throw new Error("`jobId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new GustoClient(ctx).requestAll(
      `/v1/jobs/${encodeURIComponent(jobId)}/compensations`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

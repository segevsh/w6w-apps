import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam, PARTNER_ONLY_NOTE } from "../lib/params.ts";

/**
 * `PUT /jobs/{job_id}/dispatch` — assign employees to a job.
 *
 * The body is `{dispatched_employees: [{employee_id}]}` and the array is the
 * only required field. This action takes a plain list of ids and wraps them,
 * matching Update Job Schedule.
 *
 * It replaces the assignment rather than adding to it — the response is the
 * complete `assigned_employees` array, so send every employee who should be on
 * the job, not just the new one.
 */
interface Input {
  jobId: string;
  employeeIds: string[] | string;
  companyId?: string;
}

const jobDispatch: ActionDefinition<Input> = {
  key: "job-dispatch",
  type: "perform",
  resource: "job",
  title: "Dispatch Job",
  description:
    "Assign employees to a job. Send the full set — the response is the job's complete assigned " +
    "employee list. " + PARTNER_ONLY_NOTE,
  // Assigning the same set twice leaves the same assignment.
  idempotent: true,
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    {
      key: "employeeIds",
      label: "Employee IDs",
      type: "string",
      required: true,
      hint: "Comma-separated employee ids, from Find Employees.",
    },
    companyIdParam,
  ],
  output: [
    { key: "assigned_employees", type: "array", label: "Assigned employees" },
  ],

  execute(input, ctx) {
    const employees = toList(input.employeeIds) ?? [];
    return new HousecallClient(ctx).json(`/jobs/${encodeId(input.jobId)}/dispatch`, {
      method: "PUT",
      companyId: input.companyId,
      body: { dispatched_employees: employees.map((id) => ({ employee_id: id })) },
    });
  },
};

export default jobDispatch;

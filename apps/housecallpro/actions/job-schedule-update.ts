import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam, PARTNER_ONLY_NOTE } from "../lib/params.ts";

/**
 * `PUT /jobs/{job_id}/schedule` — set a job's schedule window.
 *
 * Two constraints the reference states and this action passes on rather than
 * discovering at runtime:
 *
 *  - **Multi-day jobs are refused here.** "Jobs with multi days feature
 *    containing more than 1 appointment can't be updated through this endpoint,
 *    must use appointments endpoints."
 *  - **`start_time` is the only required field.** `end_time` is optional.
 *
 * `dispatched_employees` is `[{employee_id}]` on the wire; this action takes a
 * plain list of employee ids and builds those objects, because the one-key
 * wrapper carries no information a user could get wrong in a useful way.
 */
interface Input {
  jobId: string;
  startTime: string;
  endTime?: string;
  arrivalWindowInMinutes?: number;
  notify?: boolean;
  notifyPro?: boolean;
  dispatchedEmployeeIds?: string[] | string;
  companyId?: string;
}

const jobScheduleUpdate: ActionDefinition<Input> = {
  key: "job-schedule-update",
  type: "perform",
  resource: "job",
  title: "Update Job Schedule",
  description:
    "Set a job's scheduled window, arrival window and dispatched employees. Refused for a " +
    "multi-day job with more than one appointment — use the appointment actions for those. " +
    PARTNER_ONLY_NOTE,
  // Setting the same window twice leaves the same schedule, so a retry is safe.
  // `notify` may re-send a customer notification, which is why it defaults off.
  idempotent: true,
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    {
      key: "startTime",
      label: "Start time",
      type: "datetime",
      required: true,
      hint: "ISO-8601, e.g. 2026-03-23T15:30:00.",
    },
    { key: "endTime", label: "End time", type: "datetime" },
    { key: "arrivalWindowInMinutes", label: "Arrival window (minutes)", type: "number" },
    { key: "notify", label: "Notify the customer", type: "boolean" },
    { key: "notifyPro", label: "Notify the employee", type: "boolean" },
    {
      key: "dispatchedEmployeeIds",
      label: "Dispatched employee IDs",
      type: "string",
      hint: "Comma-separated employee ids.",
    },
    companyIdParam,
  ],
  output: [
    { key: "start_time", type: "string", label: "Start time" },
    { key: "end_time", type: "string", label: "End time" },
    { key: "arrival_window_minutes", type: "number", label: "Arrival window (minutes)" },
    { key: "assigned_employees", type: "array", label: "Assigned employees" },
    { key: "appointments", type: "array", label: "Appointments" },
  ],

  execute(input, ctx) {
    const employees = toList(input.dispatchedEmployeeIds);
    return new HousecallClient(ctx).json(`/jobs/${encodeId(input.jobId)}/schedule`, {
      method: "PUT",
      companyId: input.companyId,
      body: compact({
        start_time: input.startTime,
        end_time: input.endTime,
        arrival_window_in_minutes: input.arrivalWindowInMinutes,
        notify: input.notify,
        notify_pro: input.notifyPro,
        dispatched_employees: employees?.map((id) => ({ employee_id: id })),
      }),
    });
  },
};

export default jobScheduleUpdate;

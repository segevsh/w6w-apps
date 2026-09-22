import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam } from "../lib/params.ts";

/**
 * `PUT /job_item_users/{job_item_user_id}` — change a schedule entry.
 *
 * Status and planned minutes are writable; the logged/completed roll-ups are
 * read-only, since they are what the timesheets underneath have already
 * produced.
 */
interface Input {
  jobItemUserId: number;
  jobItemUserStatus?: unknown;
  jobCurrencySellRate?: number;
  totalPlannedMinutes?: number;
}

const jobItemUserUpdate: ActionDefinition<Input> = {
  key: "job-item-user-update",
  type: "perform",
  resource: "job-item-user",
  title: "Update Job Item User",
  description: "Change a schedule entry's status, sell rate or planned minutes.",
  idempotent: true,
  params: [
    idParam("jobItemUserId", "Job Item User ID"),
    modelObjectParam("jobItemUserStatus", "Status", '{ "id": 1, "name": "Scheduled" }'),
    { key: "jobCurrencySellRate", label: "Sell Rate", type: "number" },
    {
      key: "totalPlannedMinutes",
      label: "Planned Minutes",
      type: "number",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Schedule entry ID" },
    { key: "jobItemUserStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "totalPlannedMinutes", type: "number", label: "Planned minutes" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/job_item_users/${encodeId(input.jobItemUserId)}`, {
      method: "PUT",
      body: compact({
        jobItemUserStatus: asOptionalJson(input.jobItemUserStatus, "jobItemUserStatus"),
        jobCurrencySellRate: input.jobCurrencySellRate,
        totalPlannedMinutes: input.totalPlannedMinutes,
      }),
    });
  },
};

export default jobItemUserUpdate;

import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam } from "../lib/params.ts";

/**
 * `POST /job_items/{job_item_id}/job_item_users` — schedule a person on an item.
 *
 * Writable: `userId`, `jobItemUserStatus`, `jobCurrencySellRate` and
 * `totalPlannedMinutes`. The last one is the interesting one — the schema says
 * "Writes only apply when time is allocated by person", so on an item using
 * "Time By Item" this field is accepted and ignored, and the plan that matters
 * lives on the item itself.
 */
interface Input {
  jobItemId: number;
  userId: number;
  jobItemUserStatus?: unknown;
  jobCurrencySellRate?: number;
  totalPlannedMinutes?: number;
}

const jobItemUserCreate: ActionDefinition<Input> = {
  key: "job-item-user-create",
  type: "perform",
  resource: "job-item-user",
  title: "Create Job Item User",
  description:
    "Schedule a user on a job item. Planned minutes only apply when the item allocates time by " +
    "person.",
  idempotent: false,
  params: [
    idParam("jobItemId", "Job Item ID"),
    idParam("userId", "User ID", "Ids come from List Users."),
    modelObjectParam("jobItemUserStatus", "Status", '{ "id": 1, "name": "Scheduled" }'),
    { key: "jobCurrencySellRate", label: "Sell Rate", type: "number", hint: "In job currency." },
    {
      key: "totalPlannedMinutes",
      label: "Planned Minutes",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Applied only when the item allocates time by person; ignored on a pooled item.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New schedule entry ID" },
    { key: "jobItemId", type: "number", label: "Job item ID" },
    { key: "userId", type: "number", label: "User ID" },
    { key: "totalPlannedMinutes", type: "number", label: "Planned minutes" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/job_items/${encodeId(input.jobItemId)}/job_item_users`,
      {
        method: "POST",
        body: compact({
          userId: input.userId,
          jobItemUserStatus: asOptionalJson(input.jobItemUserStatus, "jobItemUserStatus"),
          jobCurrencySellRate: input.jobCurrencySellRate,
          totalPlannedMinutes: input.totalPlannedMinutes,
        }),
      },
    );
  },
};

export default jobItemUserCreate;

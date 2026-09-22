import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /job_items/{job_item_id}/job_item_users` — who is booked on an item.
 *
 * `totalPlannedMinutes` here is the per-person plan, and the commodity note in
 * the schema matters: an item that pools its planned time at item level
 * ("Time By Item") stores **no** per-user plan and reports 0 for everybody. A
 * zero in this list is therefore not proof that nobody is booked for any time —
 * check the item's `timeAllocationMethod` before reading it that way.
 */
interface Input {
  jobItemId: number;
}

const jobItemUsersList: ActionDefinition<Input> = {
  key: "job-item-users-list",
  type: "search",
  resource: "job-item-user",
  title: "List Job Item Users",
  description:
    "List the people scheduled on a job item, with their planned/incomplete/logged minutes. " +
    "Per-person planned minutes read 0 when the item pools its time at item level.",
  params: [idParam("jobItemId", "Job Item ID")],
  output: [{ key: "jobItemUsers", type: "array", label: "Scheduled users" }],

  async execute(input, ctx) {
    const jobItemUsers = await new StreamtimeClient(ctx).request<unknown[]>(
      `/job_items/${encodeId(input.jobItemId)}/job_item_users`,
    );
    return { jobItemUsers: jobItemUsers ?? [] };
  },
};

export default jobItemUsersList;

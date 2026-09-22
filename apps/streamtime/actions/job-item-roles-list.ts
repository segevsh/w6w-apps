import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /job_items/{job_item_id}/job_item_roles` — the roles booked on an item.
 *
 * A role assignment is where planned *role* time lives: `totalPlannedMinutes`
 * per role, with the sell rate and the planned-time totals in job currency. The
 * people themselves are separate — see `job-item-users-list`.
 */
interface Input {
  jobItemId: number;
}

const jobItemRolesList: ActionDefinition<Input> = {
  key: "job-item-roles-list",
  type: "search",
  resource: "job-item-role",
  title: "List Job Item Roles",
  description: "List the role assignments on a job item.",
  params: [idParam("jobItemId", "Job Item ID")],
  output: [
    {
      key: "jobItemRoles",
      type: "array",
      label: "Role assignments — `{ id, jobItemId, roleId, active, totalPlannedMinutes, … }`",
    },
  ],

  async execute(input, ctx) {
    const jobItemRoles = await new StreamtimeClient(ctx).request<unknown[]>(
      `/job_items/${encodeId(input.jobItemId)}/job_item_roles`,
    );
    return { jobItemRoles: jobItemRoles ?? [] };
  },
};

export default jobItemRolesList;

import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /job_item_roles/{job_item_role_id}` — one role assignment. */
interface Input {
  jobItemRoleId: number;
}

const jobItemRoleGet: ActionDefinition<Input> = {
  key: "job-item-role-get",
  type: "read",
  resource: "job-item-role",
  title: "Get Job Item Role",
  description: "Fetch one job item role assignment by id.",
  params: [idParam("jobItemRoleId", "Job Item Role ID")],
  output: [
    { key: "id", type: "number", label: "Role assignment ID" },
    { key: "jobItemId", type: "number", label: "Job item ID" },
    { key: "roleId", type: "number", label: "Role ID" },
    { key: "active", type: "boolean", label: "Is the assignment active" },
    { key: "totalPlannedMinutes", type: "number", label: "Planned minutes" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/job_item_roles/${encodeId(input.jobItemRoleId)}`);
  },
};

export default jobItemRoleGet;

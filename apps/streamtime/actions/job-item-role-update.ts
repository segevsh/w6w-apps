import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `PUT /job_item_roles/{job_item_role_id}` — change a role assignment's plan. */
interface Input {
  jobItemRoleId: number;
  roleId?: number;
  jobCurrencySellRate?: number;
  totalPlannedMinutes?: number;
}

const jobItemRoleUpdate: ActionDefinition<Input> = {
  key: "job-item-role-update",
  type: "perform",
  resource: "job-item-role",
  title: "Update Job Item Role",
  description: "Change a job item role's role, sell rate or planned minutes.",
  idempotent: true,
  params: [
    idParam("jobItemRoleId", "Job Item Role ID"),
    { key: "roleId", label: "Role ID", type: "number", validation: { integer: true, min: 1 } },
    { key: "jobCurrencySellRate", label: "Sell Rate", type: "number" },
    {
      key: "totalPlannedMinutes",
      label: "Planned Minutes",
      type: "number",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Role assignment ID" },
    { key: "roleId", type: "number", label: "Role ID" },
    { key: "totalPlannedMinutes", type: "number", label: "Planned minutes" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/job_item_roles/${encodeId(input.jobItemRoleId)}`,
      {
        method: "PUT",
        body: compact({
          roleId: input.roleId,
          jobCurrencySellRate: input.jobCurrencySellRate,
          totalPlannedMinutes: input.totalPlannedMinutes,
        }),
      },
    );
  },
};

export default jobItemRoleUpdate;

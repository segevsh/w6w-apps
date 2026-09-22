import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /job_items/{job_item_id}/job_item_roles` — book a role on an item.
 *
 * The writable set is `roleId`, `jobCurrencySellRate` and `totalPlannedMinutes`;
 * `active` and the two computed totals are read-only. `jobItemId` is in the path
 * and read-only on the model.
 */
interface Input {
  jobItemId: number;
  roleId: number;
  jobCurrencySellRate?: number;
  totalPlannedMinutes?: number;
}

const jobItemRoleCreate: ActionDefinition<Input> = {
  key: "job-item-role-create",
  type: "perform",
  resource: "job-item-role",
  title: "Create Job Item Role",
  description: "Assign a role to a job item with its own sell rate and planned minutes.",
  idempotent: false,
  params: [
    idParam("jobItemId", "Job Item ID"),
    idParam("roleId", "Role ID", "Ids come from List Roles."),
    { key: "jobCurrencySellRate", label: "Sell Rate", type: "number", hint: "In job currency." },
    {
      key: "totalPlannedMinutes",
      label: "Planned Minutes",
      type: "number",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "New role assignment ID" },
    { key: "jobItemId", type: "number", label: "Job item ID" },
    { key: "roleId", type: "number", label: "Role ID" },
    { key: "totalPlannedMinutes", type: "number", label: "Planned minutes" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/job_items/${encodeId(input.jobItemId)}/job_item_roles`,
      {
        method: "POST",
        body: compact({
          roleId: input.roleId,
          jobCurrencySellRate: input.jobCurrencySellRate,
          totalPlannedMinutes: input.totalPlannedMinutes,
        }),
      },
    );
  },
};

export default jobItemRoleCreate;

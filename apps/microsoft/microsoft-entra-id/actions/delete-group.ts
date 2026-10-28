import type { ActionDefinition } from "@w6w/types";
import { GraphClient, seg } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
}

/**
 * `DELETE /groups/{id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-delete?view=graph-rest-1.0
 *
 * Answers `204 No Content`. Microsoft 365 and security groups are soft-deleted for 30 days and can
 * be restored with Restore Deleted Item; distribution groups are permanently deleted at once. Deleting a role-assignable group additionally needs
 * `RoleManagement.ReadWrite.Directory` (not requested by this App) and the Privileged Role
 * Administrator role, or being the group's creator.
 */
const deleteGroup: ActionDefinition<Input, { deleted: boolean; groupId: string }> = {
  key: "delete-group",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Delete a group. Microsoft 365 and security groups stay restorable for 30 days.",
  idempotent: true,
  params: [groupIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "groupId", type: "string", label: "Group id" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    ctx.log("info", "deleting group", { groupId: input.groupId });
    await client.request(`/groups/${seg(input.groupId)}`, { method: "DELETE" });
    return { deleted: true, groupId: input.groupId };
  },
};

export default deleteGroup;

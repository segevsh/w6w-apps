import type { ActionDefinition } from "@w6w/types";
import { GraphClient, refPath } from "../lib/client.ts";
import { groupIdParam, objectIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  memberId: string;
}

/**
 * `DELETE /groups/{id}/members/{memberId}/$ref`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-delete-members?view=graph-rest-1.0
 *
 * Answers `204 No Content`. The trailing `/$ref` is what makes this remove the **membership**.
 * Graph's caution is explicit: without it, and when the caller can manage that object type, the
 * member object itself is deleted from Entra ID — an app holding both `Group.ReadWrite.All` and
 * `User.ReadWrite.All` would delete the *user*. `refPath()` always appends it and a test pins that.
 *
 * Removing from a role-assignable group needs `RoleManagement.ReadWrite.Directory` (not requested
 * by this App) and the Privileged Role Administrator role.
 */
const removeGroupMember: ActionDefinition<
  Input,
  { removed: boolean; groupId: string; memberId: string }
> = {
  key: "remove-group-member",
  type: "perform",
  resource: "group-member",
  title: "Remove Group Member",
  description: "Remove a member from a group without deleting the member itself.",
  idempotent: true,
  params: [
    groupIdParam,
    objectIdParam("memberId", "Member", "Object id of the member to remove."),
  ],
  output: [
    { key: "removed", type: "boolean", label: "Removed" },
    { key: "groupId", type: "string", label: "Group id" },
    { key: "memberId", type: "string", label: "Member id" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    ctx.log("info", "removing group member", { groupId: input.groupId, memberId: input.memberId });
    await client.request(refPath(input.groupId, "members", input.memberId), { method: "DELETE" });
    return { removed: true, groupId: input.groupId, memberId: input.memberId };
  },
};

export default removeGroupMember;

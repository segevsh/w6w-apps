import type { ActionDefinition } from "@w6w/types";
import { directoryObjectRef, entraError, GraphClient, seg } from "../lib/client.ts";
import { groupIdParam, objectIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  memberId: string;
}

/**
 * `POST /groups/{id}/members/$ref`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-post-members?view=graph-rest-1.0
 *
 * Body `{ "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/{id}" }`; answers `204 No
 * Content`. Microsoft 365 groups can only hold users; security groups can hold users, other
 * security groups, devices, service principals and organizational contacts. Least privileged scope
 * `GroupMember.ReadWrite.All`; this App's `Group.ReadWrite.All` is listed as sufficient — adding a
 * service principal, device or contact additionally needs permission to read that object type.
 *
 * Documented failures worth knowing: `400` when the object is already a member **or** when the
 * group was created moments ago and has not replicated ("The source resource object or one of the
 * objects being referenced don't exist" — retry after a short delay); `404` when the object does
 * not exist; `403` for a group that Graph cannot manage (Exchange distribution groups, for example)
 * or a role-assignable group the caller lacks `RoleManagement.ReadWrite.Directory` for.
 *
 * `idempotent: false`: re-adding an existing member is a `400`, not a no-op.
 */
const addGroupMember: ActionDefinition<
  Input,
  { added: boolean; groupId: string; memberId: string }
> = {
  key: "add-group-member",
  type: "perform",
  resource: "group-member",
  title: "Add Group Member",
  description: "Add a user (or, for security groups, another directory object) to a group.",
  idempotent: false,
  params: [
    groupIdParam,
    objectIdParam(
      "memberId",
      "Member",
      "Object id of the user, security group, device, service principal or contact to add.",
    ),
  ],
  output: [
    { key: "added", type: "boolean", label: "Added" },
    { key: "groupId", type: "string", label: "Group id" },
    { key: "memberId", type: "string", label: "Member id" },
  ],

  async execute(input, ctx) {
    if (!input.memberId?.trim()) throw new Error(entraError("Member is required."));
    const client = new GraphClient(ctx);
    ctx.log("info", "adding group member", { groupId: input.groupId, memberId: input.memberId });
    await client.request(`/groups/${seg(input.groupId)}/members/$ref`, {
      method: "POST",
      body: directoryObjectRef(input.memberId),
    });
    return { added: true, groupId: input.groupId, memberId: input.memberId };
  },
};

export default addGroupMember;

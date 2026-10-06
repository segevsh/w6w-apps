import type { ActionDefinition } from "@w6w/types";
import { GraphClient, refPath } from "../lib/client.ts";
import { groupIdParam, objectIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  ownerId: string;
}

/**
 * `DELETE /groups/{id}/owners/{ownerId}/$ref`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-delete-owners?view=graph-rest-1.0
 *
 * Answers `204 No Content`. Removes the ownership reference only (the `/$ref` suffix, see Remove
 * Group Member). Needs `Group.ReadWrite.All` and a role such as Groups Administrator, or to be an
 * owner; User Administrator and Directory Writers can change user owners only.
 */
const removeGroupOwner: ActionDefinition<
  Input,
  { removed: boolean; groupId: string; ownerId: string }
> = {
  key: "remove-group-owner",
  type: "perform",
  resource: "group-owner",
  title: "Remove Group Owner",
  description: "Remove an owner from a group without deleting the owner.",
  idempotent: true,
  params: [
    groupIdParam,
    objectIdParam("ownerId", "Owner", "Object id of the owner to remove."),
  ],
  output: [
    { key: "removed", type: "boolean", label: "Removed" },
    { key: "groupId", type: "string", label: "Group id" },
    { key: "ownerId", type: "string", label: "Owner id" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    ctx.log("info", "removing group owner", { groupId: input.groupId, ownerId: input.ownerId });
    await client.request(refPath(input.groupId, "owners", input.ownerId), { method: "DELETE" });
    return { removed: true, groupId: input.groupId, ownerId: input.ownerId };
  },
};

export default removeGroupOwner;

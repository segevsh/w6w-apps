import type { ActionDefinition } from "@w6w/types";
import { API_URL, entraError, GraphClient, seg } from "../lib/client.ts";
import { groupIdParam, objectIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  ownerId: string;
}

/**
 * `POST /groups/{id}/owners/$ref`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-post-owners?view=graph-rest-1.0
 *
 * Body `{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{id}" }` — the reference's own
 * example, and the form this App sends (a user; a service principal is also accepted by Graph but
 * is not offered). Answers `204 No Content`; `400` if the object is already an owner, `404` if it
 * does not exist. Needs `Group.ReadWrite.All` and a role such as Groups Administrator, or to be an
 * existing owner of the group.
 *
 * `idempotent: false`: re-adding an owner is a `400`, not a no-op.
 */
const addGroupOwner: ActionDefinition<Input, { added: boolean; groupId: string; ownerId: string }> =
  {
    key: "add-group-owner",
    type: "perform",
    resource: "group-owner",
    title: "Add Group Owner",
    description: "Add a user as an owner of a group.",
    idempotent: false,
    params: [
      groupIdParam,
      objectIdParam("ownerId", "Owner", "Object id of the user to make an owner."),
    ],
    output: [
      { key: "added", type: "boolean", label: "Added" },
      { key: "groupId", type: "string", label: "Group id" },
      { key: "ownerId", type: "string", label: "Owner id" },
    ],

    async execute(input, ctx) {
      if (!input.ownerId?.trim()) throw new Error(entraError("Owner is required."));
      const client = new GraphClient(ctx);
      ctx.log("info", "adding group owner", { groupId: input.groupId, ownerId: input.ownerId });
      await client.request(`/groups/${seg(input.groupId)}/owners/$ref`, {
        method: "POST",
        body: { "@odata.id": `${API_URL}/users/${seg(input.ownerId)}` },
      });
      return { added: true, groupId: input.groupId, ownerId: input.ownerId };
    },
  };

export default addGroupOwner;

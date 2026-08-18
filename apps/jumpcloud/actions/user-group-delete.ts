import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `DELETE /api/v2/usergroups/{id}` (**V2**) — verified against JumpCloud's V2
 * OpenAPI document (`groups_user_delete`).
 *
 * **Deleting a group revokes whatever it granted.** A user group is not a
 * label: it is the edge that binds people to applications, LDAP, RADIUS and
 * devices. Removing it removes all of those bindings at once, for everyone in
 * it, and the users themselves are untouched — which is exactly why the effect
 * is easy to underestimate. `user-group-get`'s associations are worth reading
 * first.
 */
const action: ActionDefinition = {
  key: "user-group-delete",
  type: "perform",
  resource: "user-group",
  title: "Delete a user group",
  description: "Delete a user group and every access binding it carried.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "I understand every binding on this group goes with it",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Applications, LDAP, RADIUS and device bindings are lost for all members.",
    },
  ],
  output: [
    { key: "groupId", type: "string", label: "Group ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.groupId ?? "").trim();
    if (!id) throw new Error("`groupId` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a group revokes everything it granted");
    }

    ctx.log("warn", "deleting a JumpCloud user group", { id });

    await new JumpCloudClient(ctx).request(`/usergroups/${encodeURIComponent(id)}`, {
      api: "v2",
      method: "DELETE",
    });
    return { groupId: id, deleted: true };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/v2/usergroups/{group_id}/members` (**V2**) — verified against
 * JumpCloud's V2 OpenAPI document (`graph_userGroupMembersPost`; body
 * `{op, type: "user", id}` with `op` one of `add`, `remove`, `update`).
 *
 * **This is the grant.** In JumpCloud, access to an application, an LDAP
 * directory, a RADIUS network or a set of devices is carried by group
 * membership — so adding somebody here is granting all of it, and removing them
 * is the revoke half of offboarding.
 *
 * **The response says nothing.** It is a `204` with no body, and JumpCloud
 * returns the same `204` for adding a user who was already a member and for
 * removing one who was not. There is no per-call confirmation to read, so this
 * action returns what it asked for rather than pretending to report what
 * changed. `user-group-member-list` is how you check.
 *
 * **On a dynamic group it will not stick.** A group with a `memberQuery`
 * computes its own membership; JumpCloud accepts the write and then recomputes
 * over it. The group is fetched first so this fails loudly instead of appearing
 * to work.
 */
const action: ActionDefinition = {
  key: "user-group-member-set",
  type: "perform",
  resource: "user-group",
  title: "Add or remove a group member",
  description: "Grant or revoke access by changing a user's membership of a group.",
  // Adding an existing member is a no-op that answers 204, same as a fresh add.
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
    {
      key: "op",
      label: "Operation",
      type: "select",
      required: true,
      default: "add",
      options: [
        { value: "add", label: "Add — grants everything the group carries" },
        { value: "remove", label: "Remove — revokes it" },
      ],
    },
    {
      key: "allowDynamic",
      label: "Write to a dynamic group anyway",
      type: "boolean",
      default: false,
      hint: "Off, this refuses a group whose membership is computed, because the change would " +
        "be silently undone.",
    },
  ],
  output: [
    { key: "groupId", type: "string", label: "Group ID" },
    { key: "userId", type: "string", label: "User ID" },
    { key: "op", type: "string", label: "The operation sent" },
    { key: "applied", type: "boolean", label: "Accepted — JumpCloud returns 204 either way" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const groupId = String(p.groupId ?? "").trim();
    if (!groupId) throw new Error("`groupId` is required");
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    const op = String(p.op ?? "add");
    if (op !== "add" && op !== "remove") throw new Error("`op` must be `add` or `remove`");

    const client = new JumpCloudClient(ctx);

    if (p.allowDynamic !== true) {
      const group = await client.request<{ memberQuery?: unknown }>(
        `/usergroups/${encodeURIComponent(groupId)}`,
        { api: "v2" },
      );
      if (group?.memberQuery) {
        throw new Error(
          "this group is DYNAMIC — its membership is computed from a query, so this change " +
            "would be recomputed away. Set `allowDynamic` to write anyway.",
        );
      }
    }

    ctx.log("info", "changing JumpCloud group membership", { groupId, userId, op });

    await client.request(`/usergroups/${encodeURIComponent(groupId)}/members`, {
      api: "v2",
      method: "POST",
      body: { op, type: "user", id: userId },
    });
    return { groupId, userId, op, applied: true };
  },
};

export default action;

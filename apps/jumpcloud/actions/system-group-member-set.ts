import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/v2/systemgroups/{group_id}/members` (**V2**) — verified against
 * JumpCloud's V2 OpenAPI document (`graph_systemGroupMembersPost`; body
 * `{op, type: "system", id}`).
 *
 * Note `type: "system"`, not `"user"` — the two membership endpoints share a
 * body shape whose `type` is a `const` per endpoint, so sending the wrong one
 * is a 400 rather than a wrong write. It is set here, not by the caller.
 *
 * Adding a device to a group applies every policy attached to that group to the
 * machine, and makes it a target for every command bound to it. As with user
 * groups, the response is a bare `204` — there is nothing in it to read.
 */
const action: ActionDefinition = {
  key: "system-group-member-set",
  type: "perform",
  resource: "system-group",
  title: "Add or remove a device from a group",
  description: "Move a device in or out of a group, applying or removing that group's policies.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Device Group ID", type: "string", required: true, default: "" },
    { key: "systemId", label: "Device ID", type: "string", required: true, default: "" },
    {
      key: "op",
      label: "Operation",
      type: "select",
      required: true,
      default: "add",
      options: [
        { value: "add", label: "Add — applies the group's policies to this device" },
        { value: "remove", label: "Remove — stops applying them" },
      ],
    },
  ],
  output: [
    { key: "groupId", type: "string", label: "Device group ID" },
    { key: "systemId", type: "string", label: "Device ID" },
    { key: "op", type: "string", label: "The operation sent" },
    { key: "applied", type: "boolean", label: "Accepted — JumpCloud returns 204 either way" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const groupId = String(p.groupId ?? "").trim();
    if (!groupId) throw new Error("`groupId` is required");
    const systemId = String(p.systemId ?? "").trim();
    if (!systemId) throw new Error("`systemId` is required");
    const op = String(p.op ?? "add");
    if (op !== "add" && op !== "remove") throw new Error("`op` must be `add` or `remove`");

    ctx.log("info", "changing JumpCloud device group membership", { groupId, systemId, op });

    await new JumpCloudClient(ctx).request(
      `/systemgroups/${encodeURIComponent(groupId)}/members`,
      { api: "v2", method: "POST", body: { op, type: "system", id: systemId } },
    );
    return { groupId, systemId, op, applied: true };
  },
};

export default action;

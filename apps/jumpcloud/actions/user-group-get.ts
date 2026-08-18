import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `GET /api/v2/usergroups/{id}` (**V2**) — verified against JumpCloud's V2
 * OpenAPI document (`groups_user_get`).
 *
 * The field worth reading is `memberQuery`. A group with one is **dynamic**:
 * its membership is computed from an attribute rule, and adding somebody by
 * hand does not stick — JumpCloud recomputes it. That is why
 * `user-group-member-set` checks for it before writing.
 */
const action: ActionDefinition = {
  key: "user-group-get",
  type: "read",
  resource: "user-group",
  title: "Get a user group",
  description: "Retrieve one user group, including whether its membership is dynamic.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "email", type: "string", label: "Group email" },
    { key: "type", type: "string", label: "Group type" },
    { key: "memberQuery", type: "object", label: "Present means DYNAMIC — membership is computed" },
    { key: "memberQueryExemptions", type: "array", label: "Members exempt from the query" },
    { key: "attributes", type: "object", label: "Group attributes (POSIX, Samba, LDAP)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.groupId ?? "").trim();
    if (!id) throw new Error("`groupId` is required");

    ctx.log("info", "getting a JumpCloud user group", { id });

    return await new JumpCloudClient(ctx).request(`/usergroups/${encodeURIComponent(id)}`, {
      api: "v2",
    });
  },
};

export default action;

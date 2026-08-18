import type { ActionDefinition } from "@w6w/types";
import { compact, json, JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/v2/usergroups` (**V2**) — verified against JumpCloud's V2 OpenAPI
 * document (`groups_user_post`).
 *
 * A group created with a `memberQuery` is **dynamic**: JumpCloud computes its
 * members from the rule and keeps recomputing them, so manual adds do not
 * stick. Created without one it is static, and membership is whatever
 * `user-group-member-set` puts there. The choice is not reversible in a useful
 * way, so it is made explicitly here rather than by whether a field happened to
 * be filled in.
 */
const action: ActionDefinition = {
  key: "user-group-create",
  type: "perform",
  resource: "user-group",
  title: "Create a user group",
  description: "Create a static user group, or a dynamic one driven by an attribute rule.",
  // JumpCloud allows two groups with the same name, so this cannot dedupe.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "email",
      label: "Group Email",
      type: "string",
      default: "",
      hint: "Used by the directory integrations that sync this group.",
    },
    {
      key: "memberQuery",
      label: "Dynamic Member Query",
      type: "json",
      default: "",
      placeholder: '{"queryType":"FilterQuery","filters":' +
        '[{"field":"department","operator":"eq","value":"Engineering"}]}',
      hint: "Set this and the group becomes DYNAMIC — JumpCloud computes membership and manual " +
        "adds will not stick. Leave blank for a static group.",
    },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      default: "",
      placeholder: '{"posixGroups":[{"id":5001,"name":"engineering"}]}',
      hint: "POSIX, Samba and LDAP attributes for the group.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Group type" },
    { key: "memberQuery", type: "object", label: "Present means dynamic" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const memberQuery = json(p.memberQuery, "memberQuery");

    const body = compact({
      name,
      description: p.description,
      email: p.email,
      memberQuery,
      attributes: json(p.attributes, "attributes"),
    });

    ctx.log("info", "creating a JumpCloud user group", { name, dynamic: Boolean(memberQuery) });

    return await new JumpCloudClient(ctx).request("/usergroups", {
      api: "v2",
      method: "POST",
      body,
    });
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/usergroups/{id}/members` and `…/membership` (**V2**) — verified
 * against JumpCloud's V2 OpenAPI document (`graph_userGroupMembersList`,
 * `graph_userGroupMembership`).
 *
 * **Two endpoints, two different answers, and the difference is silent.**
 * `members` returns the graph edges directly attached to this group.
 * `membership` returns the resolved set — every user who is effectively in it,
 * including those pulled in through nesting or a dynamic query. For an audit
 * question ("who can reach this application?") only the second is correct, and
 * the first will quietly under-report.
 *
 * They also return different shapes: `members` gives graph connections with the
 * user id under `to.id`, while `membership` gives the user ids themselves. Both
 * are returned as JumpCloud sends them rather than flattened into a shared
 * shape that would hide which question was asked.
 */
const action: ActionDefinition = {
  key: "user-group-member-list",
  type: "read",
  resource: "user-group",
  title: "List a user group's members",
  description: "List a group's direct members, or everyone effectively in it.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    {
      key: "resolution",
      label: "Which Members",
      type: "select",
      default: "membership",
      options: [
        {
          value: "membership",
          label: "Effective — everyone in it, including via nesting or a dynamic query",
        },
        { value: "members", label: "Direct — only edges attached to this group" },
      ],
      hint: "Effective is the default: for 'who can reach this?', direct membership " +
        "under-reports without saying so.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.groupId ?? "").trim();
    if (!id) throw new Error("`groupId` is required");
    // The host applies `default`, but a bare execute() call does not.
    const resolution = p.resolution === "members" ? "members" : "membership";
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing JumpCloud user group members", { id, resolution });

    return await new JumpCloudClient(ctx).requestAll(
      `/usergroups/${encodeURIComponent(id)}/${resolution}`,
      { api: "v2" },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

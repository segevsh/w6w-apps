import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v1.0/members` — the caller's team members.
 *
 * Answers a page plus the `get_metadata` envelope. Each member carries the
 * record `id`, the `memberUserId` that lead assignment uses, `roleName`, and
 * the two counts that make the list useful for routing: `newLeadCount`
 * (unassigned leads routable to this member) and `assignedLeadCount`.
 *
 * `groupIds` filters by office / group; omitted, every visible member is
 * returned.
 */
interface Input {
  groupIds?: string;
  limit?: number;
  offset?: number;
}

const action: ActionDefinition<Input> = {
  key: "member-list",
  type: "read",
  resource: "member",
  title: "List Team Members",
  description: "List the team's members, optionally filtered by office (GET /v1.0/members).",
  params: [
    {
      key: "groupIds",
      label: "Office IDs",
      type: "string",
      hint: "Comma-separated office / group ids. Omit to return every visible member.",
    },
    ...paginationParams(50, "Members per page."),
  ],
  output: [
    { key: "get_metadata", type: "object", label: "Pagination metadata" },
    { key: "members", type: "array", label: "Team members" },
  ],

  execute(input, ctx) {
    return new LoftyClient(ctx).request("/members", {
      query: { groupIds: input.groupIds, limit: input.limit, offset: input.offset },
    });
  },
};

export default action;

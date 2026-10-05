import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /teams` — "Get teams (inboxes)" (scope `teams:read`). Salesmsg calls an inbox a *team*;
 * `team_id` is what `message-send` needs. Answers a bare array.
 */
interface Input {
  limit?: number;
  has_membership?: boolean;
}

const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List Inboxes",
  description: "List the teams (inboxes) of the organization, each with its sending number.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum rows to return.",
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "has_membership",
      label: "Only my inboxes",
      type: "boolean",
      hint: "Only teams the current user is a member of.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "meta", type: "object", label: "Pagination block, when the vendor sends one" },
  ],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).items("/teams", {
      query: {
        limit: input.limit,
        has_membership: input.has_membership,
      },
    });
  },
};

export default teamList;

import type { ActionDefinition } from "@w6w/types";
import { FathomClient, type ListResult } from "../lib/client.ts";
import { cursorParam, listOutput, teamParam } from "../lib/params.ts";

interface Input {
  cursor?: string;
  team?: string;
}

/**
 * `GET /team_members` — members of the account's teams, each
 * `{ name, email, created_at }`.
 *
 * Distinct from Get Many Users, and the difference matters: this endpoint is
 * readable by any key and returns the roster, while `/users` is
 * account-admin-only and returns permissions and account status as well.
 */
const teamMemberGetMany: ActionDefinition<Input, ListResult> = {
  key: "team-member-get-many",
  type: "search",
  resource: "team-member",
  title: "Get Many Team Members",
  description: "List team members, optionally filtered to one team by name.",
  params: [cursorParam, teamParam],
  output: listOutput,

  execute(input, ctx) {
    return new FathomClient(ctx).list("/team_members", {
      query: { cursor: input.cursor, team: input.team },
    });
  },
};

export default teamMemberGetMany;

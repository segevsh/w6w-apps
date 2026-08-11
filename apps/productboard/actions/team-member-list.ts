import type { ActionDefinition } from "@w6w/types";
import { encodeId, type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/teams/{id}/members` — who is on a team.
 *
 * The pairing that makes `entity-list`'s `teams[name]` filter useful: find the
 * team, list its members, then act on the people who own the work.
 *
 * Same PII caveat as `member-list` — a token without the PII scope sees the
 * literal string `"[redacted]"` in place of an email address, not an omitted
 * field.
 */
interface Input {
  teamId: string;
  pageCursor?: string;
}

const teamMemberList: ActionDefinition<Input, ListResult> = {
  key: "team-member-list",
  type: "search",
  resource: "team",
  title: "List team members",
  description:
    "List the members of one team. Emails read `[redacted]` when the token lacks the PII scope.",
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      required: true,
      hint: "UUID from a List teams result.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list(
      `/teams/${encodeId(input.teamId)}/members`,
      { query: { pageCursor: input.pageCursor } },
    );
  },
};

export default teamMemberList;

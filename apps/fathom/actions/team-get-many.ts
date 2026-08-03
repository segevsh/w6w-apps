import type { ActionDefinition } from "@w6w/types";
import { FathomClient, type ListResult } from "../lib/client.ts";
import { cursorParam, listOutput } from "../lib/params.ts";

interface Input {
  cursor?: string;
}

/**
 * `GET /teams` — the teams on the account, each `{ name, created_at }`.
 *
 * Teams are identified by NAME everywhere in this API — there is no team id —
 * so this is the lookup behind the `teams` filter on Get Many Meetings and the
 * `team` filter on Get Many Team Members and Get Many Users.
 */
const teamGetMany: ActionDefinition<Input, ListResult> = {
  key: "team-get-many",
  type: "search",
  resource: "team",
  title: "Get Many Teams",
  description: "List the teams on this Fathom account.",
  params: [cursorParam],
  output: listOutput,

  execute(input, ctx) {
    return new FathomClient(ctx).list("/teams", { query: { cursor: input.cursor } });
  },
};

export default teamGetMany;

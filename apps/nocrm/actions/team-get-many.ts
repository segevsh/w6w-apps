import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

/** No input: the List-all-the-teams section documents no parameters. */
type Input = Record<string, never>;

/**
 * `GET /api/v2/teams` — list the account's teams.
 *
 * The List-all-the-teams section of noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents **no parameters at
 * all** — no `direction`, no `limit`, no filter — so this action declares none
 * rather than inventing paging the vendor does not offer. Its sample response
 * nests each team's members with `is_manager`, which is what a routing
 * workflow needs to pick a team and then a person.
 */
const teamGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "team-get-many",
  type: "search",
  resource: "team",
  title: "List Teams",
  description: "List the account's teams and their members (GET /api/v2/teams).",
  params: [],
  output: listOutput("Teams"),

  execute(_input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/teams`);
  },
};

export default teamGetMany;

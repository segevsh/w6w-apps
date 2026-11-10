import teamList from "../actions/team-list.ts";
import { resultsOf, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c). `GET /users/me/teams` returns the teams the connected user belongs to
 * in one unpaged `{ "results": [...] }` response (see the README's list-envelope table), a handful
 * of rows watched as a snapshot.
 */
export default snapshotTrigger({
  key: "new-team",
  title: "New Team",
  description: "The run gets each team the connected user newly belongs to.",
  output: [
    { key: "key", type: "string", label: "Team key" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { key: "team_101", name: "Sales" },
  rows: async (_p, ctx) => resultsOf(await teamList.execute({}, ctx)),
});

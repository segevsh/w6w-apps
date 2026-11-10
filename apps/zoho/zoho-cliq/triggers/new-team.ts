import teamList from "../actions/team-list.ts";
import { snapshotTrigger, str } from "../lib/triggers.ts";

/**
 * `GET /api/v2/teams` through `team-list`: the endpoint documents no paging, so the organization's
 * teams come back in one response and are snapshot-diffed (additions only)
 * (https://www.zoho.com/cliq/help/restapi/v2/, "Teams").
 */
export default snapshotTrigger({
  key: "new-team",
  title: "New Team",
  description: "The run gets each team created in the Zoho Cliq organization.",
  output: [
    { key: "team_id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "participant_count", type: "number", label: "Members" },
    { key: "creation_time", type: "string", label: "Created at" },
  ],
  sample: {
    team_id: "54342319",
    name: "Zylker Support",
    description: "Exclusive team with Zylker Support Professionals",
    participant_count: 3,
    creation_time: "2017-11-08T15:18:49+05:30",
  },
  rows: async (_params, ctx) => (await teamList.execute({}, ctx)).teams,
  idOf: (item) => str((item as { team_id?: unknown }).team_id),
});

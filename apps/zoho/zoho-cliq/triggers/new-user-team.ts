import userTeamList from "../actions/user-team-list.ts";
import { snapshotTrigger, str } from "../lib/triggers.ts";

/**
 * `GET /api/v2/users/{userId}/teams` through `user-team-list`: no paging documented, so the user's
 * teams come back in one response and are snapshot-diffed (additions only), i.e. the run starts
 * when the chosen user is added to a team (https://www.zoho.com/cliq/help/restapi/v2/, "Teams").
 */
export default snapshotTrigger({
  key: "new-user-team",
  title: "User Added to Team",
  description: "The run gets each team that the chosen user joins.",
  params: [{
    key: "userId",
    label: "User ID",
    type: "string",
    required: true,
    hint: "The user whose team memberships to watch.",
  }],
  output: [
    { key: "team_id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { team_id: "54342319", name: "Zylker Support" },
  rows: async (params, ctx) =>
    (await userTeamList.execute({ userId: str(params.userId) }, ctx)).teams,
  idOf: (item) =>
    str((item as { team_id?: unknown; id?: unknown }).team_id ?? (item as { id?: unknown }).id),
});

import teamMemberList from "../actions/team-member-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// GET /teams/{id}/members answers with the whole roster in one response (no paging or sort;
// https://developer.mixmax.com/reference/teams-members-get, verified 2026-11-10); diffed by id.
export default snapshotTrigger<{ teamId: string }>({
  key: "new-team-member",
  title: "New Team Member",
  description: "The run gets each person newly added to the chosen team.",
  action: teamMemberList as never,
  params: [{
    key: "teamId",
    label: "Team ID",
    type: "string",
    required: true,
    hint: "The team `_id` (from List Teams).",
  }],
  input: (p) => ({ teamId: p.teamId }),
  output: [
    { key: "_id", type: "string", label: "Member ID" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { _id: "member-sample-1", email: "rep@example.test" },
});

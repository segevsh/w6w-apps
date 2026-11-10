import teamList from "../actions/team-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// GET /teams answers with the teams the user is on in one response (no paging or sort;
// https://developer.mixmax.com/reference/teams-get, verified 2026-11-10); diffed by id.
export default snapshotTrigger<Record<string, unknown>>({
  key: "new-team",
  title: "New Team",
  description: "The run gets each team the user newly joins or that is newly created.",
  action: teamList as never,
  input: () => ({}),
  output: [
    { key: "_id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { _id: "team-sample-1", name: "Sales" },
});

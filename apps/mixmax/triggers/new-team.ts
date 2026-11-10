import { pollFromListAction } from "../../_shared/poll/mod.ts";
import teamList from "../actions/team-list.ts";

// GET /teams lists the teams "newest first", paginated with `limit` (default 100, at most 500)
// (https://developer.mixmax.com/reference/teams-1), so page 1 of 100 is the feed.
export default pollFromListAction({
  key: "new-team",
  title: "New Team",
  description: "The run gets each team the user newly joins or that is newly created.",
  action: teamList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { _id: "team-sample-1", name: "Sales" },
  maxPages: 1,
});

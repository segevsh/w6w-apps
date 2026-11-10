import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/team-list.ts";

export default snapshotTrigger({
  key: "new-team",
  title: "New Team",
  description:
    "The run gets each team newly created in the organization, polled from the existing `team-list` action (the whole collection, diffed by id).",
  action,
  input: () => ({ deleted: false }),
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "attributes", type: "object", label: "Team attributes (name, displayName)" },
  ],
  sample: { id: "5f0a1b2c3d4e5f6a7b8c9d11", type: "team", attributes: { name: "support" } },
});

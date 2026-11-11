import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/organization-list.ts";

export default snapshotTrigger({
  key: "new-organization",
  title: "New Organization",
  description:
    "The run gets each organization newly visible to the service account, polled from the existing `organization-list` action (the whole list, diffed by organization id).",
  action,
  listKey: "organizations",
  idOf: (item) => item.id,
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "5f8d0d55b54eff0f2b2c3d53", name: "Example Org", isDeleted: false },
});

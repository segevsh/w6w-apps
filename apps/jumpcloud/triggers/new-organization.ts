import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/organization-list.ts";

export default snapshotTrigger({
  key: "new-organization",
  title: "New Organization",
  description:
    "The run gets each organization newly visible to the API key, polled from the existing `organization-list` action (the whole collection, diffed by id).",
  action,
  idOf: (item) => item._id ?? item.id,
  output: [
    { key: "_id", type: "string", label: "Organization ID" },
    { key: "displayName", type: "string", label: "Display name" },
  ],
  sample: { _id: "5f0a1b2c3d4e5f6a7b8c9d12", displayName: "Example Co" },
});

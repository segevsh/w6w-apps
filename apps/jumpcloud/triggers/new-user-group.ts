import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/user-group-list.ts";

export default snapshotTrigger({
  key: "new-user-group",
  title: "New User Group",
  description:
    "The run gets each user group newly created, polled from the existing `user-group-list` action (the whole collection, diffed by id).",
  action,
  idOf: (item) => item.id,
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
  ],
  sample: { id: "5f0a1b2c3d4e5f6a7b8c9d14", name: "Engineering", type: "user_group" },
});

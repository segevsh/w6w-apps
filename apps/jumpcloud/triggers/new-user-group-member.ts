import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/user-group-member-list.ts";

export default snapshotTrigger({
  key: "new-user-group-member",
  title: "New User Group Member",
  description:
    "The run gets each user newly added to the chosen user group (effective membership), polled from the existing `user-group-member-list` action.",
  action,
  input: (params) => ({ groupId: params.groupId, resolution: "membership" }),
  idOf: (item) => item.id,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Member ID" },
    { key: "type", type: "string", label: "Member type" },
  ],
  sample: { id: "5f0a1b2c3d4e5f6a7b8c9d0e", type: "user", paths: [] },
});

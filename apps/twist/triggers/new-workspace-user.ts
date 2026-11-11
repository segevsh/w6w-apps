import type { ActionDefinition } from "@w6w/types";
import workspaceUserList from "../actions/workspace-user-list.ts";
import { collectionSnapshot } from "../lib/triggers.ts";

export default collectionSnapshot({
  key: "new-workspace-user",
  title: "New Workspace User",
  description: "The run gets each user newly added to the Twist workspace you choose.",
  action: workspaceUserList as unknown as ActionDefinition,
  params: [workspaceUserList.params![0]],
  input: (params) => ({ workspaceId: params.workspaceId }),
  output: [{ key: "id", type: "number", label: "User ID" }],
  sample: { id: 101, name: "Casey Example" },
});

import type { ActionDefinition } from "@w6w/types";
import groupList from "../actions/group-list.ts";
import { collectionSnapshot } from "../lib/triggers.ts";

export default collectionSnapshot({
  key: "new-group",
  title: "New Group",
  description: "The run gets each new group in the Twist workspace you choose.",
  action: groupList as unknown as ActionDefinition,
  params: [groupList.params![0]],
  input: (params) => ({ workspaceId: params.workspaceId }),
  output: [{ key: "id", type: "number", label: "Group ID" }],
  sample: { id: 101, name: "Support" },
});

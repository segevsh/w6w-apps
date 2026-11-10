import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import groupList from "../actions/group-list.ts";

export default pollFromListAction({
  key: "new-group",
  title: "New Group",
  description: "The run gets each new group in the Twist workspace you choose.",
  action: groupList as unknown as ActionDefinition,
  input: (params: { workspaceId?: number }) => ({ workspaceId: params.workspaceId }),
  params: [groupList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Group ID" }],
  sample: { id: 101, name: "Support" },
});

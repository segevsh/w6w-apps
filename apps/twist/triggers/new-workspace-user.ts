import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import workspaceUserList from "../actions/workspace-user-list.ts";

export default pollFromListAction({
  key: "new-workspace-user",
  title: "New Workspace User",
  description: "The run gets each user newly added to the Twist workspace you choose.",
  action: workspaceUserList as unknown as ActionDefinition,
  input: (params: { workspaceId?: number }) => ({ workspaceId: params.workspaceId }),
  params: [workspaceUserList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "User ID" }],
  sample: { id: 101, name: "Casey Example" },
});

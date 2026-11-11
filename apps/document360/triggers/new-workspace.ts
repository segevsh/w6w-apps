import type { ActionDefinition } from "@w6w/types";
import workspaceList from "../actions/workspace-list.ts";
import { boundedListSnapshot } from "../lib/triggers.ts";

export default boundedListSnapshot({
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each new workspace in the project you choose.",
  action: workspaceList as unknown as ActionDefinition,
  params: workspaceList.params,
  input: (params) => params,
  output: [{ key: "id", type: "string", label: "Workspace ID" }],
  sample: { id: "workspace-101", name: "Version 2" },
});

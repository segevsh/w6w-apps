import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import workspaceList from "../actions/workspace-list.ts";

export default pollFromListAction({
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each workspace newly visible to the current Twist user.",
  action: workspaceList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Workspace ID" }],
  sample: { id: 101, name: "Acme" },
});

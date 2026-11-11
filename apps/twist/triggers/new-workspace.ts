import type { ActionDefinition } from "@w6w/types";
import workspaceList from "../actions/workspace-list.ts";
import { collectionSnapshot } from "../lib/triggers.ts";

export default collectionSnapshot({
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each workspace newly visible to the current Twist user.",
  action: workspaceList as unknown as ActionDefinition,
  input: () => ({}),
  output: [{ key: "id", type: "number", label: "Workspace ID" }],
  sample: { id: 101, name: "Acme" },
});

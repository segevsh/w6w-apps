import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/user-list.ts";

export default snapshotTrigger({
  key: "new-workspace-user",
  title: "New Workspace User",
  description: "The run gets each newly added Superchat workspace user.",
  action: action as unknown as ActionDefinition,
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user_1" },
});

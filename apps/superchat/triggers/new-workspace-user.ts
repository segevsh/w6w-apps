import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/user-list.ts";

export default pollFromListAction<Record<string, never>>({
  key: "new-workspace-user",
  title: "New Workspace User",
  description: "The run gets each newly added Superchat workspace user.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user_1" },
  maxPages: 1,
});

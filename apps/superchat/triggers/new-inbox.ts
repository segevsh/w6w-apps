import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/inbox-list.ts";

export default pollFromListAction<Record<string, never>>({
  key: "new-inbox",
  title: "New Inbox",
  description: "The run gets each newly created Superchat inbox.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Inbox ID" }],
  sample: { id: "inbox_1" },
  maxPages: 1,
});

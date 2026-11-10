import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskList from "../actions/task-list.ts";

export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each newly created task.",
  action: taskList as ActionDefinition,
  input: (_params) => ({ order: "desc", limit: 100 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),

  output: [{ key: "id", type: "string", label: "New Task ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});

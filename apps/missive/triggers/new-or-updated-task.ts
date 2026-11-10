import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import taskList from "../actions/task-list.ts";

export default pollFromListAction({
  key: "new-or-updated-task",
  title: "New or Updated Task",
  description: "The run gets each new or newly active Missive task.",
  action: taskList as unknown as ActionDefinition,
  input: () => ({ limit: 50, type: "all" }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => {
    const task = item as { id?: unknown; last_activity_at?: unknown };
    return `${String(task.id ?? "")}:${String(task.last_activity_at ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Task ID" }],
  sample: { id: "task-new", last_activity_at: 1794225600 },
  maxPages: 1,
});

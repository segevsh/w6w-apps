import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskList from "../actions/task-list.ts";

/**
 * `GET` list with `sort_by=updated_at&sort_direction=DESC`: most recently updated first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-or-updated-task",
  title: "New or Updated Task",
  description: "The run gets each task when it is created or updated (for example completed).",
  action: taskList,
  input: () => ({ sortBy: "updated_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { updated_at?: unknown }).updated_at ?? ""}`,
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "current_state", type: "string", label: "Current state" },
    { key: "task_type", type: "string", label: "Task type" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 5501,
    current_state: "scheduled",
    task_type: "call",
    updated_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});

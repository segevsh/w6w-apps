import { snapshotTrigger } from "../lib/snapshot.ts";
import taskList from "../actions/task-list.ts";

/**
 * `GET /api/v2/tasks` (https://axonaut.com/api/v2/doc, 2026-11-10) is served unordered and unfiltered, one page per `page`
 * header with no total, so each check reads every page and diffs the ids against the previous check (added only).
 */
export default snapshotTrigger({
  key: "new-task",
  title: "New Task",
  description: "The run gets each task newly created in Axonaut.",
  action: taskList as never,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "priority", type: "string", label: "Priority" },
    { key: "task_status_name", type: "string", label: "Status" },
    { key: "creation_date", type: "string", label: "Creation date" },
  ],
  sample: {
    id: 6601,
    title: "Send the quote",
    priority: "normal",
    task_status_name: "To do",
    creation_date: "2026-11-09",
  },
});

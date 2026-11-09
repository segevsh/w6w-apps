import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskList from "../actions/task-list.ts";

export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "Polls the newest Seamless.AI tasks from task-list.",
  action: taskList,
  input: (params) => ({
    ...params,
    sortColumn: "createdAt",
    sortOrder: "desc",
    limit: 100,
    offset: 0,
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String((item as { taskId?: string; id?: string }).taskId ?? (item as { id: string }).id),
  params: taskList.params,
  output: [{ key: "taskId", type: "string", label: "Task ID" }],
  sample: { taskId: "task_123", status: "TODO" },
  maxPages: 1,
});

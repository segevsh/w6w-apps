import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskList from "../actions/task-list.ts";

export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each newly created task.",
  action: taskList,
  input: () => ({ sortField: "CreatedDate", sortOrder: "Desc", pageSize: 100 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Task ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});

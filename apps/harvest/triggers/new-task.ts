import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskGetMany from "../actions/task-get-many.ts";

export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each new task.",
  action: taskGetMany,
  input: () => ({ perPage: 100 }),
  items: (result) => (result as { tasks?: unknown[] }).tasks ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Task ID" }],
  sample: { id: 1, name: "Design" },
  maxPages: 1,
});

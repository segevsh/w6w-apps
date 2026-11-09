import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/task-list.ts";

const trigger = pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each newly created task for the selected Browse AI robot.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, page: 1, pageSize: 10 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: string }).id),
  params: action.params,
  output: [{ key: "id", type: "string", label: "Task ID" }],
  sample: { id: "task_1", status: "finished" },
  maxPages: 1,
});

export default trigger;

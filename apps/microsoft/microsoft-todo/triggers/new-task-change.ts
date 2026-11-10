import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listTaskChanges from "../actions/list-task-changes.ts";

export default pollFromListAction({
  key: "new-task-change",
  title: "New Task Change",
  description: "The run gets each new Microsoft To Do task change.",
  action: listTaskChanges as unknown as ActionDefinition,
  input: (params: { taskList: string }) => ({
    ...params,
    orderBy: "receivedDateTime desc",
    top: 100,
  }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "taskList", label: "Task list ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Task ID" }],
  sample: { id: "task-new", title: "New task" },
  maxPages: 1,
});

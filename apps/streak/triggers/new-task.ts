import type { Param } from "@w6w/types";
import taskList from "../actions/task-list.ts";
import { resultsOf, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c) of one box the user picks. `GET /boxes/{boxKey}/tasks` returns every task
 * on the box in one unpaged `{ "results": [...] }` response, a short list per box.
 */
export default snapshotTrigger<{ boxKey: string }>({
  key: "new-task",
  title: "New Task",
  description: "The run gets each task newly added to the selected box.",
  params: (taskList.params ?? []) as Param[],
  output: [
    { key: "key", type: "string", label: "Task key" },
    { key: "boxKey", type: "string", label: "Box key" },
    { key: "text", type: "string", label: "Task text" },
    { key: "done", type: "boolean", label: "Done" },
  ],
  sample: { key: "task_101", boxKey: "box_101", text: "Send proposal", done: false },
  rows: async (p, ctx) => resultsOf(await taskList.execute({ boxKey: p.boxKey }, ctx)),
});

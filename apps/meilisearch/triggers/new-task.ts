import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskList from "../actions/task-list.ts";

/**
 * `GET /tasks?limit=100` — the vendor returns tasks in descending `uid` order by default (most
 * recently created first), so page 1 is the newest feed. `uid` is the stable id.
 */
export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description:
    "The run gets each new asynchronous task (indexing, settings change, …): its uid, index, type and status.",
  action: taskList as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (item) => String((item as { uid?: unknown }).uid ?? ""),
  output: [
    { key: "uid", type: "number", label: "Task uid" },
    { key: "indexUid", type: "string", label: "Index uid" },
    { key: "status", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Task type" },
    { key: "enqueuedAt", type: "string", label: "Enqueued at" },
  ],
  sample: {
    uid: 4312,
    indexUid: "movies",
    status: "enqueued",
    type: "documentAdditionOrUpdate",
    enqueuedAt: "2026-11-09T10:00:00.000000Z",
  },
  maxPages: 1,
});

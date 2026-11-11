import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/task-list.ts";
import { idOf, itemsOf, NEWEST_FIRST } from "../lib/triggers.ts";

// GET /actor-tasks?desc=1&limit=100&offset=0 — "Get list of tasks": "desc: if true or 1 then the
// objects are sorted by the createdAt field in descending order. By default, they are sorted in
// ascending order." https://docs.apify.com/api/v2/actor-tasks-get
export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each Actor task newly created on the account.",
  action,
  input: () => ({ ...NEWEST_FIRST }),
  items: itemsOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Task name" },
    { key: "actId", type: "string", label: "Actor ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "task-101",
    name: "daily-crawl",
    actId: "actor-1",
    createdAt: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});

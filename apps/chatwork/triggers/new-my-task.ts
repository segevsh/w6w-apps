import { newestFirstTrigger } from "../lib/triggers.ts";
import myTasksList from "../actions/my-tasks-list.ts";

export default newestFirstTrigger({
  key: "new-my-task",
  title: "New Task Assigned to Me",
  description:
    "The run gets each new task assigned to the connected account in any chat (up to 100 per check, order undocumented).",
  action: myTasksList,
  input: () => ({}),
  idKey: "task_id",
  output: [
    { key: "task_id", type: "number", label: "Task ID" },
    { key: "room", type: "object", label: "The chat the task belongs to" },
    { key: "assigned_by_account", type: "object", label: "Who assigned this task" },
    { key: "message_id", type: "string", label: "The message ID the task came from" },
    { key: "body", type: "string", label: "Task text" },
    { key: "limit_time", type: "number", label: "Deadline (Unix seconds), 0 if none" },
    { key: "status", type: "string", label: "open | done" },
    { key: "limit_type", type: "string", label: "none | date | time" },
  ],
  sample: {
    task_id: 9002,
    room: { room_id: 100200, name: "Project Alpha" },
    assigned_by_account: { account_id: 99, name: "Grace Hopper" },
    message_id: "5550002",
    body: "Review the draft",
    limit_time: 0,
    status: "open",
    limit_type: "none",
  },
});

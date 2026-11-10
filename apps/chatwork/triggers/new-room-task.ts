import { newestFirstTrigger } from "../lib/triggers.ts";
import roomTaskList from "../actions/room-task-list.ts";

interface Params {
  roomId: string;
}

export default newestFirstTrigger<Params>({
  key: "new-room-task",
  title: "New Chat Task",
  description:
    "The run gets each new task in a Chatwork chat (the latest tasks are checked, newest first).",
  action: roomTaskList,
  input: (p) => ({ roomId: p.roomId }),
  idKey: "task_id",
  params: [{ key: "roomId", label: "Room ID", type: "string", required: true }],
  output: [
    { key: "task_id", type: "number", label: "Task ID" },
    { key: "account", type: "object", label: "Who the task is assigned to" },
    { key: "assigned_by_account", type: "object", label: "Who assigned this task" },
    { key: "message_id", type: "string", label: "The message ID the task came from" },
    { key: "body", type: "string", label: "Task text" },
    { key: "limit_time", type: "number", label: "Deadline (Unix seconds), 0 if none" },
    { key: "status", type: "string", label: "open | done" },
    { key: "limit_type", type: "string", label: "none | date | time" },
  ],
  sample: {
    task_id: 9001,
    account: { account_id: 1234, name: "Ada Lovelace" },
    assigned_by_account: { account_id: 99, name: "Grace Hopper" },
    message_id: "5550001",
    body: "Send the report",
    limit_time: 1794214800,
    status: "open",
    limit_type: "date",
  },
});

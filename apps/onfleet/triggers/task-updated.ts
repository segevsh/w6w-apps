import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-updated",
  title: "Task Updated",
  description:
    "The run gets each Onfleet task update, including completion details and recipient feedback.",
  trigger: 7,
  triggerName: "taskUpdated",
  sample: {
    triggerId: 7,
    triggerName: "taskUpdated",
    time: 1763467200000,
    taskId: "8Gp6LZ0pnc8dNsxL3VnHsOWs",
    workerId: "e2cQnkDvzTFHmnfeT8Adfhkf",
    adminId: null,
    task: { id: "8Gp6LZ0pnc8dNsxL3VnHsOWs", shortId: "a1b2c3d4", state: 2 },
    worker: null,
  },
});

import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-created",
  title: "Task Created",
  description: "The run gets each new Onfleet task.",
  trigger: 6,
  triggerName: "taskCreated",
  sample: {
    triggerId: 6,
    triggerName: "taskCreated",
    time: 1763467200000,
    taskId: "8Gp6LZ0pnc8dNsxL3VnHsOWs",
    workerId: "e2cQnkDvzTFHmnfeT8Adfhkf",
    adminId: null,
    task: { id: "8Gp6LZ0pnc8dNsxL3VnHsOWs", shortId: "a1b2c3d4", state: 0 },
    worker: null,
  },
});

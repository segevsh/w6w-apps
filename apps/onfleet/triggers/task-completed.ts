import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-completed",
  title: "Task Completed",
  description: "The run gets each Onfleet task marked successful, with its completion details.",
  trigger: 3,
  triggerName: "taskCompleted",
  sample: {
    triggerId: 3,
    triggerName: "taskCompleted",
    time: 1763467200000,
    taskId: "8Gp6LZ0pnc8dNsxL3VnHsOWs",
    workerId: "e2cQnkDvzTFHmnfeT8Adfhkf",
    adminId: null,
    task: { id: "8Gp6LZ0pnc8dNsxL3VnHsOWs", shortId: "a1b2c3d4", state: 3 },
    worker: null,
  },
});

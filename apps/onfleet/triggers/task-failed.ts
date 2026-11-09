import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-failed",
  title: "Task Failed",
  description: "The run gets each Onfleet task a worker fails.",
  trigger: 4,
  triggerName: "taskFailed",
  sample: {
    triggerId: 4,
    triggerName: "taskFailed",
    time: 1763467200000,
    taskId: "8Gp6LZ0pnc8dNsxL3VnHsOWs",
    workerId: "e2cQnkDvzTFHmnfeT8Adfhkf",
    adminId: null,
    task: { id: "8Gp6LZ0pnc8dNsxL3VnHsOWs", shortId: "a1b2c3d4", state: 3 },
    worker: null,
  },
});

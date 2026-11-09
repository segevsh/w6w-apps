import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-started",
  title: "Task Started",
  description: "The run gets each Onfleet task a worker starts.",
  trigger: 0,
  triggerName: "taskStarted",
  sample: {
    triggerId: 0,
    triggerName: "taskStarted",
    time: 1763467200000,
    taskId: "8Gp6LZ0pnc8dNsxL3VnHsOWs",
    workerId: "e2cQnkDvzTFHmnfeT8Adfhkf",
    adminId: null,
    task: { id: "8Gp6LZ0pnc8dNsxL3VnHsOWs", shortId: "a1b2c3d4", state: 2 },
    worker: null,
  },
});

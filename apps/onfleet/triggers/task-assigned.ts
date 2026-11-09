import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-assigned",
  title: "Task Assigned",
  description: "The run gets each Onfleet task assigned to a worker.",
  trigger: 9,
  triggerName: "taskAssigned",
  sample: {
    triggerId: 9,
    triggerName: "taskAssigned",
    time: 1763467200000,
    taskId: "8Gp6LZ0pnc8dNsxL3VnHsOWs",
    workerId: "e2cQnkDvzTFHmnfeT8Adfhkf",
    adminId: null,
    task: { id: "8Gp6LZ0pnc8dNsxL3VnHsOWs", shortId: "a1b2c3d4", state: 1 },
    worker: null,
  },
});

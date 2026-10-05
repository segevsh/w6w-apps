import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "worker-history-list",
  resource: "worker",
  title: "List a worker's history",
  description: "The historical staffing events recorded for a worker. " +
    "Common service v1 `GET /workers/{ID}/history`; secured by Worker Data: Historical Staffing Information.",
  service: "common",
  path: "/workers/{ID}/history",
  idKey: "workerId",
  idLabel: "Worker ID",
});

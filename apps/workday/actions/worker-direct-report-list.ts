import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "worker-direct-report-list",
  resource: "worker",
  title: "List a worker's direct reports",
  description:
    "The workers who report directly to the given manager. Common service v1 `GET /workers/{ID}/directReports`; " +
    "secured by Reports: Manager, Reports: Matrix Manager or Self-Service: My Team.",
  service: "common",
  path: "/workers/{ID}/directReports",
  idKey: "workerId",
  idLabel: "Manager worker ID",
});

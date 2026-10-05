import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "worker-get",
  resource: "worker",
  title: "Get a worker",
  description:
    "One worker with current staffing information: worker type, primary and additional jobs, " +
    "prehire ID and the linked person. Staffing service v7 `GET /workers/{ID}`.",
  service: "staffing",
  path: "/workers/{ID}",
  idKey: "workerId",
  idLabel: "Worker ID",
});

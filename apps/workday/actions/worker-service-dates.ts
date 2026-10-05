import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "worker-service-dates",
  resource: "worker",
  title: "Get a worker's service dates",
  description:
    "Hire date and continuous service date for a worker. Staffing service v7 `GET /workers/{ID}/serviceDates`.",
  service: "staffing",
  path: "/workers/{ID}/serviceDates",
  idKey: "workerId",
  idLabel: "Worker ID",
});

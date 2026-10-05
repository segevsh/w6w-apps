import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "worker-organization-list",
  resource: "worker",
  title: "List a worker's organizations",
  description:
    "Every organization a worker belongs to (supervisory, cost center, company and so on). " +
    "Common service v1 `GET /workers/{ID}/organizations`; secured by Reports: Organization.",
  service: "common",
  path: "/workers/{ID}/organizations",
  idKey: "workerId",
  idLabel: "Worker ID",
});
